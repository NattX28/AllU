package services

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/NattX28/AllU/internal/dto"
	"github.com/NattX28/AllU/internal/models"
	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"
	"gorm.io/gorm"
)

type EnrollService struct {
	db  *gorm.DB
	rdb *redis.Client
}

func NewEnrollService(db *gorm.DB, rdb *redis.Client) *EnrollService {
	return &EnrollService{db: db, rdb: rdb}
}

// ─── Helpers ────

// getActivePeriod returns the current active enrollment period or error if none.
func (s *EnrollService) getActivePeriod() (*models.EnrollmentPeriod, error) {
	var period models.EnrollmentPeriod
	if err := s.db.Where("is_active = ?", true).First(&period).Error; err != nil {
		return nil, errors.New("no active enrollment period")
	}
	return &period, nil
}

// getStudent fetches student by profile UUID (students.id).
func (s *EnrollService) getStudent(tx *gorm.DB, studentID uuid.UUID) (*models.Student, error) {
	var std models.Student
	if err := tx.First(&std, "id = ?", studentID).Error; err != nil {
		return nil, errors.New("student not found")
	}
	return &std, nil
}

func majorToAbbr(major string) string {
	words := strings.Fields(major)
	var abbr strings.Builder
	for _, w := range words {
		if len(w) > 0 {
			abbr.WriteByte(strings.ToUpper(w)[0])
		}
	}
	return abbr.String()
}

// checkMajorPermission returns error if course is not open for the student's major.
func checkMajorPermission(course models.Course, major string) error {
	if course.Category == models.ElectiveCourse || course.Category == models.GenEdCourse {
		return nil
	}
	if major == "admin" {
		return nil
	}

	abbr := majorToAbbr(major) // "Computer Science" → "CS"
	if !strings.HasSuffix(strings.TrimSpace(course.NameEn), abbr) {
		return fmt.Errorf("course %s is not open for major %s", course.NameEn, major)
	}
	return nil
}

// mapSchedules converts model schedules to DTO slots.
func mapSchedules(schedules []models.SectionSchedule) []dto.ScheduleSlot {
	slots := make([]dto.ScheduleSlot, 0, len(schedules))
	for _, sch := range schedules {
		slots = append(slots, dto.ScheduleSlot{
			Day:       string(sch.Day),
			StartTime: sch.StartTime,
			EndTime:   sch.EndTime,
			Room:      sch.Room,
			Type:      string(sch.Type),
		})
	}
	return slots
}

// ─── Seat Check ────

func (s *EnrollService) CheckDraftSeats(sectionIDs []string) ([]dto.CheckSeatsResponse, error) {
	ctx := context.Background()
	results := make([]dto.CheckSeatsResponse, 0, len(sectionIDs))

	for _, sid := range sectionIDs {
		key := fmt.Sprintf("section:%s:seats", sid)
		val, err := s.rdb.Get(ctx, key).Int()
		if err != nil {
			val = 0
		}
		results = append(results, dto.CheckSeatsResponse{
			SectionID: sid,
			Available: val,
			IsFull:    val <= 0,
		})
	}

	return results, nil
}

// ─── Confirm ────

func (s *EnrollService) ConfirmEnrollment(studentID uuid.UUID, sectionIDs []string) (*dto.ConfirmEnrollResponse, error) {
	if _, err := s.getActivePeriod(); err != nil {
		return nil, err
	}

	ctx := context.Background()
	var processedIDs []string
	var totalCredits int

	err := s.db.Transaction(func(tx *gorm.DB) error {
		std, err := s.getStudent(tx, studentID)
		if err != nil {
			return err
		}

		// Validate all sections first before touching Redis
		for _, sidStr := range sectionIDs {
			sid, _ := uuid.Parse(sidStr)
			var sec models.Section
			if err := tx.Preload("Course").First(&sec, "id = ?", sid).Error; err != nil {
				return fmt.Errorf("section not found: %s", sidStr)
			}
			if err := checkMajorPermission(sec.Course, std.Major); err != nil {
				return err
			}
			totalCredits += sec.Course.Credits
		}

		if totalCredits > 22 {
			return fmt.Errorf("total credits exceed limit: %d (max 22)", totalCredits)
		}

		// Decrement seats and save enrollments
		for _, sidStr := range sectionIDs {
			sid, _ := uuid.Parse(sidStr)
			key := fmt.Sprintf("section:%s:seats", sidStr)

			remaining, _ := s.rdb.Decr(ctx, key).Result()
			if remaining < 0 {
				s.rdb.Incr(ctx, key)
				return fmt.Errorf("section %s is full", sidStr)
			}
			processedIDs = append(processedIDs, sidStr)

			var sec models.Section
			tx.First(&sec, "id = ?", sid)

			if err := tx.Create(&models.Enrollment{
				StudentID:    std.StudentID,
				SectionID:    sid,
				Status:       models.StatusEnrolled,
				Semester:     sec.Semester,
				AcademicYear: sec.AcademicYear,
			}).Error; err != nil {
				return err
			}

			tx.Model(&sec).Update("enrolled", gorm.Expr("enrolled + 1"))
		}

		return nil
	})

	if err != nil {
		// Rollback Redis seats that were already decremented
		for _, sidStr := range processedIDs {
			s.rdb.Incr(ctx, fmt.Sprintf("section:%s:seats", sidStr))
		}
		return nil, err
	}

	return &dto.ConfirmEnrollResponse{
		Message:      "enrollment confirmed",
		EnrolledIDs:  sectionIDs,
		TotalCredits: totalCredits,
	}, nil
}

// ─── Update ────

func (s *EnrollService) UpdateEnrollment(studentID uuid.UUID, newSids []string) error {
	if _, err := s.getActivePeriod(); err != nil {
		return err
	}

	ctx := context.Background()

	return s.db.Transaction(func(tx *gorm.DB) error {
		std, err := s.getStudent(tx, studentID)
		if err != nil {
			return err
		}

		// Load current enrollments
		var currentEnrolls []models.Enrollment
		tx.Preload("Section.Course").
			Where("student_id = ? AND status = ?", std.StudentID, models.StatusEnrolled).
			Find(&currentEnrolls)

		oldMap := make(map[string]models.Enrollment, len(currentEnrolls))
		for _, en := range currentEnrolls {
			oldMap[en.SectionID.String()] = en
		}
		newMap := make(map[string]bool, len(newSids))
		for _, sid := range newSids {
			newMap[sid] = true
		}

		// Validate new sections and total credits
		var totalCredits int
		for _, sidStr := range newSids {
			var sec models.Section
			if err := tx.Preload("Course").First(&sec, "id = ?", sidStr).Error; err != nil {
				return fmt.Errorf("section %s not found", sidStr)
			}
			if err := checkMajorPermission(sec.Course, std.Major); err != nil {
				return err
			}
			totalCredits += sec.Course.Credits
		}

		if totalCredits > 22 {
			return fmt.Errorf("total credits exceed limit: %d (max 22)", totalCredits)
		}

		// Remove enrollments no longer in new list
		for sidStr, en := range oldMap {
			if !newMap[sidStr] {
				s.rdb.Incr(ctx, fmt.Sprintf("section:%s:seats", sidStr))
				tx.Unscoped().Delete(&en)
				tx.Model(&models.Section{}).Where("id = ?", en.SectionID).
					Update("enrolled", gorm.Expr("enrolled - 1"))
			}
		}

		// Add new enrollments
		for sidStr := range newMap {
			if _, exists := oldMap[sidStr]; exists {
				continue
			}

			key := fmt.Sprintf("section:%s:seats", sidStr)
			remaining, _ := s.rdb.Decr(ctx, key).Result()
			if remaining < 0 {
				s.rdb.Incr(ctx, key)
				return fmt.Errorf("section %s is full", sidStr)
			}

			sid, _ := uuid.Parse(sidStr)
			var sec models.Section
			tx.First(&sec, "id = ?", sid)

			tx.Create(&models.Enrollment{
				StudentID:    std.StudentID,
				SectionID:    sid,
				Status:       models.StatusEnrolled,
				Semester:     sec.Semester,
				AcademicYear: sec.AcademicYear,
			})
			tx.Model(&sec).Update("enrolled", gorm.Expr("enrolled + 1"))
		}

		return nil
	})
}

// ─── Withdraw ───

func (s *EnrollService) WithdrawCourse(studentID uuid.UUID, enrollmentID uuid.UUID) error {
	if _, err := s.getActivePeriod(); err != nil {
		return err
	}

	return s.db.Transaction(func(tx *gorm.DB) error {
		std, err := s.getStudent(tx, studentID)
		if err != nil {
			return err
		}

		var en models.Enrollment
		if err := tx.Where("id = ? AND student_id = ? AND status = ?",
			enrollmentID, std.StudentID, models.StatusEnrolled).
			First(&en).Error; err != nil {
			return errors.New("enrollment not found or cannot be withdrawn")
		}

		en.Status = models.StatusWithdrawn
		return tx.Save(&en).Error
	})
}

// ─── History (result registration page) ────

func (s *EnrollService) GetHistory(studentID uuid.UUID, semester, academicYear int) (*dto.EnrollmentHistoryResponse, error) {
	std, err := s.getStudent(s.db, studentID)
	if err != nil {
		return nil, err
	}

	query := s.db.Preload("Section.Course").
		Where("student_id = ?", std.StudentID)

	if semester > 0 {
		query = query.Where("semester = ?", semester)
	}
	if academicYear > 0 {
		query = query.Where("academic_year = ?", academicYear)
	}

	var enrolls []models.Enrollment
	if err := query.Find(&enrolls).Error; err != nil {
		return nil, err
	}

	var totalCredits int
	items := make([]dto.EnrollmentHistoryItem, 0, len(enrolls))
	for _, en := range enrolls {
		if en.Status == models.StatusEnrolled || en.Status == models.StatusGraded {
			totalCredits += en.Section.Course.Credits
		}
		items = append(items, dto.EnrollmentHistoryItem{
			EnrollmentID:    en.ID.String(),
			CourseID:        en.Section.Course.ID,
			CourseNameTh:    en.Section.Course.NameTh,
			CourseNameEn:    en.Section.Course.NameEn,
			Credits:         en.Section.Course.Credits,
			SectionNum:      en.Section.SectionNum,
			Status:          string(en.Status),
			Semester:        en.Semester,
			AcademicYear:    en.AcademicYear,
			AttendanceScore: en.AttendanceScore,
			AssignmentScore: en.AssignmentScore,
			MidtermScore:    en.MidtermScore,
			FinalScore:      en.FinalScore,
			TotalScore:      en.TotalScore,
			Grade:           en.LetterGrade,
		})
	}

	respSemester := semester
	respYear := academicYear
	if len(enrolls) > 0 && respSemester == 0 {
		respSemester = enrolls[0].Semester
		respYear = enrolls[0].AcademicYear
	}

	return &dto.EnrollmentHistoryResponse{
		Semester:     respSemester,
		AcademicYear: respYear,
		TotalCredits: totalCredits,
		Courses:      items,
	}, nil
}

// ─── Schedule (Schedule page) ───

func (s *EnrollService) GetSchedule(studentID uuid.UUID, semester, academicYear int) (*dto.TimetableResponse, error) {
	std, err := s.getStudent(s.db, studentID)
	if err != nil {
		return nil, err
	}

	var enrolls []models.Enrollment
	if err := s.db.
		Preload("Section.Course").
		Preload("Section.Schedules").
		Where("student_id = ? AND status = ? AND semester = ? AND academic_year = ?",
			std.StudentID, []models.EnrollmentStatus{models.StatusEnrolled, models.StatusGraded}, semester, academicYear).
		Find(&enrolls).Error; err != nil {
		return nil, err
	}

	courses := make([]dto.TimetableCourse, 0, len(enrolls))
	for _, en := range enrolls {
		courses = append(courses, dto.TimetableCourse{
			EnrollmentID: en.ID.String(),
			CourseID:     en.Section.Course.ID,
			CourseNameTh: en.Section.Course.NameTh,
			CourseNameEn: en.Section.Course.NameEn,
			SectionNum:   en.Section.SectionNum,
			Credits:      en.Section.Course.Credits,
			Schedules:    mapSchedules(en.Section.Schedules),
		})
	}

	return &dto.TimetableResponse{
		Semester:     semester,
		AcademicYear: academicYear,
		Courses:      courses,
	}, nil
}
