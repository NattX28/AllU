package services

import (
	"context"
	"errors"
	"fmt"

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

// checkMajorPermission returns error if course is not open for the student.
// Logic: GENED/ELECTIVE → open to all
//
//	CORE_COURSE    → course_id prefix (4 chars) must match student faculty+dept code
//	                 student_id: YY FF DD NNNN EEE → FF DD = slice(2,6)
//	                 course_id:  FF DD xxxxx       → slice(0,4)
func checkMajorPermission(course models.Course, studentID string) error {
	if course.Category == models.ElectiveCourse || course.Category == models.GenEdCourse {
		return nil
	}
	if studentID == "" {
		return nil
	}

	// Extract faculty+dept from student_id (pos 2-5, 4 chars)
	if len(studentID) < 6 {
		return nil // student_id ไม่ครบ → ผ่านไปก่อน
	}
	studentFacultyDept := studentID[2:6] // เช่น "6702011611230" → "0201"

	// Extract faculty+dept from course_id (pos 0-3, 4 chars)
	if len(course.ID) < 4 {
		return nil
	}
	courseFacultyDept := course.ID[0:4] // เช่น "040613105" → "0406"

	if courseFacultyDept != studentFacultyDept {
		return fmt.Errorf("course %s is not open for your department", course.ID)
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

// timeToMinutes converts "09:00" → 540
func timeToMinutes(t string) int {
	var h, m int
	fmt.Sscanf(t, "%d:%d", &h, &m)
	return h*60 + m
}

// checkScheduleConflict returns error if any two schedules overlap on the same day.
// sections is the full list of sections being enrolled (including existing ones).
func checkScheduleConflict(sections []models.Section) error {
	type slot struct {
		courseID string
		start    int
		end      int
	}
	// day → list of slots
	daySlots := make(map[string][]slot)

	for _, sec := range sections {
		for _, sch := range sec.Schedules {
			day := string(sch.Day)
			start := timeToMinutes(sch.StartTime)
			end := timeToMinutes(sch.EndTime)
			for _, existing := range daySlots[day] {
				// overlap: start < existing.end && end > existing.start
				if start < existing.end && end > existing.start {
					return fmt.Errorf(
						"schedule conflict on %s: %s overlaps with %s (%s-%s)",
						day, sec.CourseID, existing.courseID, sch.StartTime, sch.EndTime,
					)
				}
			}
			daySlots[day] = append(daySlots[day], slot{courseID: sec.CourseID, start: start, end: end})
		}
	}
	return nil
}

// ─── Seed ────

// SeedSeatsFromDB syncs Redis seat counters from DB.
// Call this once on app startup to ensure Redis is consistent with DB.
func (s *EnrollService) SeedSeatsFromDB() error {
	ctx := context.Background()
	var sections []models.Section
	if err := s.db.Find(&sections).Error; err != nil {
		return fmt.Errorf("SeedSeatsFromDB: %w", err)
	}
	for _, sec := range sections {
		key := fmt.Sprintf("section:%s:seats", sec.ID.String())
		available := sec.Capacity - sec.Enrolled
		if available < 0 {
			available = 0
		}
		s.rdb.Set(ctx, key, available, 0)
	}
	return nil
}

// ─── Seat Check ────

func (s *EnrollService) CheckDraftSeats(sectionIDs []string) ([]dto.CheckSeatsResponse, error) {
	ctx := context.Background()
	results := make([]dto.CheckSeatsResponse, 0, len(sectionIDs))

	for _, sid := range sectionIDs {
		key := fmt.Sprintf("section:%s:seats", sid)
		val, err := s.rdb.Get(ctx, key).Int()
		if err != nil {
			// Redis miss → fallback to DB and re-seed the key
			var sec models.Section
			if dbErr := s.db.First(&sec, "id = ?", sid).Error; dbErr != nil {
				val = 0
			} else {
				val = sec.Capacity - sec.Enrolled
				if val < 0 {
					val = 0
				}
				s.rdb.Set(ctx, key, val, 0)
			}
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
	var totalCredits int

	err := s.db.Transaction(func(tx *gorm.DB) error {
		std, err := s.getStudent(tx, studentID)
		if err != nil {
			return err
		}

		// Validate all sections first before touching anything
		var sectionsToEnroll []models.Section
		for _, sidStr := range sectionIDs {
			sid, _ := uuid.Parse(sidStr)
			var sec models.Section
			if err := tx.Preload("Course").Preload("Schedules").First(&sec, "id = ?", sid).Error; err != nil {
				return fmt.Errorf("section not found: %s", sidStr)
			}
			if err := checkMajorPermission(sec.Course, std.StudentID); err != nil {
				return err
			}
			totalCredits += sec.Course.Credits
			sectionsToEnroll = append(sectionsToEnroll, sec)
		}

		if totalCredits > 22 {
			return fmt.Errorf("total credits exceed limit: %d (max 22)", totalCredits)
		}

		if err := checkScheduleConflict(sectionsToEnroll); err != nil {
			return err
		}

		// Check seats and save enrollments — DB is source of truth
		for _, sidStr := range sectionIDs {
			sid, _ := uuid.Parse(sidStr)

			// Lock row in DB
			var sec models.Section
			if err := tx.Set("gorm:query_option", "FOR UPDATE").
				First(&sec, "id = ?", sid).Error; err != nil {
				return fmt.Errorf("section not found: %s", sidStr)
			}
			if sec.Enrolled >= sec.Capacity {
				return fmt.Errorf("section %s is full", sidStr)
			}

			// DB update
			tx.Model(&sec).Update("enrolled", gorm.Expr("enrolled + 1"))

			// Redis update
			key := fmt.Sprintf("section:%s:seats", sidStr)
			s.rdb.Decr(ctx, key)

			if err := tx.Create(&models.Enrollment{
				StudentID:    std.StudentID,
				SectionID:    sid,
				Status:       models.StatusEnrolled,
				Semester:     sec.Semester,
				AcademicYear: sec.AcademicYear,
			}).Error; err != nil {
				return err
			}
		}

		return nil
	})

	if err != nil {
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

		// Load current enrollments (enrolled + graded — both count as "active")
		var currentEnrolls []models.Enrollment
		tx.Preload("Section.Course").
			Where("student_id = ? AND status IN ?", std.StudentID,
				[]models.EnrollmentStatus{models.StatusEnrolled, models.StatusGraded}).
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
		var sectionsToCheck []models.Section

		// Include graded sections that are NOT being replaced (they stay in schedule)
		for sidStr, en := range oldMap {
			if en.Status == models.StatusGraded && !newMap[sidStr] {
				var sec models.Section
				tx.Preload("Schedules").First(&sec, "id = ?", en.SectionID)
				sectionsToCheck = append(sectionsToCheck, sec)
				totalCredits += en.Section.Course.Credits
			}
		}

		for _, sidStr := range newSids {
			var sec models.Section
			if err := tx.Preload("Course").Preload("Schedules").First(&sec, "id = ?", sidStr).Error; err != nil {
				return fmt.Errorf("section %s not found", sidStr)
			}
			if err := checkMajorPermission(sec.Course, std.StudentID); err != nil {
				return err
			}
			totalCredits += sec.Course.Credits
			sectionsToCheck = append(sectionsToCheck, sec)
		}

		if totalCredits > 22 {
			return fmt.Errorf("total credits exceed limit: %d (max 22)", totalCredits)
		}

		if err := checkScheduleConflict(sectionsToCheck); err != nil {
			return err
		}

		// Remove enrolled (not graded) enrollments no longer in new list
		for sidStr, en := range oldMap {
			if en.Status == models.StatusGraded {
				continue // graded ไม่แตะ — เกรดออกแล้วลบไม่ได้
			}
			if !newMap[sidStr] {
				tx.Unscoped().Delete(&en)
				tx.Model(&models.Section{}).Where("id = ?", en.SectionID).
					Update("enrolled", gorm.Expr("enrolled - 1"))
				// Redis sync (best effort)
				s.rdb.Incr(ctx, fmt.Sprintf("section:%s:seats", sidStr))
			}
		}

		// Add new enrollments (skip if already exists as enrolled/graded)
		for sidStr := range newMap {
			if existing, exists := oldMap[sidStr]; exists {
				if existing.Status == models.StatusGraded {
					continue // graded อยู่แล้ว ไม่ต้อง insert ซ้ำ
				}
				continue // enrolled อยู่แล้ว ไม่ต้อง insert ซ้ำ
			}

			sid, _ := uuid.Parse(sidStr)

			// Lock row — DB ตัดสิน
			var sec models.Section
			if err := tx.Set("gorm:query_option", "FOR UPDATE").
				First(&sec, "id = ?", sid).Error; err != nil {
				return fmt.Errorf("section %s not found", sidStr)
			}
			if sec.Enrolled >= sec.Capacity {
				return fmt.Errorf("section %s is full", sidStr)
			}

			// ตรวจสอบ withdrawn enrollment ที่ยังอยู่ใน DB (soft-deleted หรือ status=withdrawn)
			// ถ้าเจอ ให้ reactivate แทนการ INSERT ใหม่ เพื่อป้องกัน duplicate key
			var existingWithdrawn models.Enrollment
			dbErr := tx.Unscoped().
				Where("student_id = ? AND section_id = ? AND (deleted_at IS NOT NULL OR status = ?)",
					std.StudentID, sid, models.StatusWithdrawn).
				First(&existingWithdrawn).Error
			if dbErr == nil {
				// มี record อยู่แล้ว (withdrawn/soft-deleted) → reactivate แทน INSERT
				existingWithdrawn.DeletedAt = gorm.DeletedAt{} // clear soft delete
				existingWithdrawn.Status = models.StatusEnrolled
				existingWithdrawn.Semester = sec.Semester
				existingWithdrawn.AcademicYear = sec.AcademicYear
				if err := tx.Unscoped().Save(&existingWithdrawn).Error; err != nil {
					return err
				}
			} else {
				if err := tx.Create(&models.Enrollment{
					StudentID:    std.StudentID,
					SectionID:    sid,
					Status:       models.StatusEnrolled,
					Semester:     sec.Semester,
					AcademicYear: sec.AcademicYear,
				}).Error; err != nil {
					return err
				}
			}

			tx.Model(&sec).Update("enrolled", gorm.Expr("enrolled + 1"))
			// Redis sync (best effort)
			s.rdb.Decr(ctx, fmt.Sprintf("section:%s:seats", sidStr))
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
		Where("student_id = ? AND status IN ?", std.StudentID,
			[]models.EnrollmentStatus{models.StatusEnrolled, models.StatusGraded})

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
		Where("student_id = ? AND status IN ? AND semester = ? AND academic_year = ?",
			std.StudentID, []models.EnrollmentStatus{models.StatusEnrolled, models.StatusGraded}, semester, academicYear).
		Find(&enrolls).Error; err != nil {
		return nil, err
	}

	courses := make([]dto.TimetableCourse, 0, len(enrolls))
	for _, en := range enrolls {
		courses = append(courses, dto.TimetableCourse{
			EnrollmentID: en.ID.String(),
			CourseID:     en.Section.Course.ID,
			SectionID:    en.Section.ID.String(),
			CourseNameTh: en.Section.Course.NameTh,
			CourseNameEn: en.Section.Course.NameEn,
			SectionNum:   en.Section.SectionNum,
			Credits:      en.Section.Course.Credits,
			Status:       string(en.Status),
			Schedules:    mapSchedules(en.Section.Schedules),
		})
	}

	return &dto.TimetableResponse{
		Semester:     semester,
		AcademicYear: academicYear,
		Courses:      courses,
	}, nil
}
