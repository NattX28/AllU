package services

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

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

func (s *EnrollService) CheckDraftSeats(sectionIDs []string) ([]dto.CheckSeatsResponse, error) {
	ctx := context.Background()
	var results []dto.CheckSeatsResponse

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

func (s *EnrollService) ConfirmEnrollment(studentID uuid.UUID, sectionIDs []string) (*dto.ConfirmEnrollResponse, error) {
	ctx := context.Background()
	var processedIDs []string
	var totalCredits int

	err := s.db.Transaction(func(tx *gorm.DB) error {
		// Check by major
		var std models.Student
		if err := tx.First(&std, "id = ?", studentID).Error; err != nil {
			return errors.New("not found student")
		}

		// Check credits and major
		for _, sidStr := range sectionIDs {
			sid, _ := uuid.Parse(sidStr)
			var sec models.Section
			if err := tx.Preload("Course").First(&sec, "id = ?", sid).Error; err != nil {
				return fmt.Errorf("section not found: %s", sidStr)
			}

			if sec.Course.Category != "GENED_COURSE" && sec.Course.Category != "ELECTIVE_COURSE" {
				if !strings.Contains(sec.Course.NameEn, std.Major) && std.Major != "admin" {
					return fmt.Errorf("course %s is not open for major %s", sec.Course.NameEn, std.Major)
				}
			}

			totalCredits += sec.Course.Credits
		}

		if totalCredits > 22 {
			return fmt.Errorf("total credits exceed limit: %d", totalCredits)
		}

		// Decrease seats in Redis
		for _, sidStr := range sectionIDs {
			sid, _ := uuid.Parse(sidStr)
			key := fmt.Sprintf("section:%s:seats", sidStr)

			remaining, _ := s.rdb.Decr(ctx, key).Result()
			if remaining < 0 {
				return fmt.Errorf("section %s is full", sidStr)
			}
			processedIDs = append(processedIDs, sidStr) // Rollback for Redis

			// Save enrollment
			var sec models.Section
			tx.First(&sec, "id = ?", sid)

			newEnroll := models.Enrollment{
				StudentID:    std.StudentID,
				SectionID:    sid,
				Status:       "enrolled",
				Semester:     sec.Semester,
				AcademicYear: sec.AcademicYear,
			}
			if err := tx.Create(&newEnroll).Error; err != nil {
				return err
			}

			// Update in section table for map with Redis
			tx.Model(&sec).Update("enrolled", gorm.Expr("enrolled + 1"))
		}

		return nil
	})

	if err != nil {
		for _, sidToRestore := range processedIDs {
			key := fmt.Sprintf("section:%s:seats", sidToRestore)
			s.rdb.Incr(ctx, key)
		}
		return nil, err
	}

	return &dto.ConfirmEnrollResponse{
		Message:      "enrollment confirmed",
		EnrolledIDs:  sectionIDs,
		TotalCredits: totalCredits,
	}, nil
}

func (s *EnrollService) UpdateEnrollment(studentID uuid.UUID, newSids []string) error {
	ctx := context.Background()

	return s.db.Transaction(func(tx *gorm.DB) error {
		// Check fac/major
		var std models.Student
		if err := tx.First(&std, "id = ?", studentID).Error; err != nil {
			return errors.New("student not found")
		}

		// Check course that student is enrolled in
		var currentEnrolls []models.Enrollment
		tx.Preload("Section.Course").Where("student_id = ? AND status = ?", studentID, "enrolled").Find(&currentEnrolls)

		// Diff
		oldMap := make(map[string]models.Enrollment)
		for _, en := range currentEnrolls {
			oldMap[en.SectionID.String()] = en
		}
		newMap := make(map[string]bool)
		for _, sid := range newSids {
			newMap[sid] = true
		}

		// Check "major permissions" and total credits
		var totalCredits int
		for _, sidStr := range newSids {
			var sec models.Section
			if err := tx.Preload("Course").First(&sec, "id = ?", sidStr).Error; err != nil {
				return fmt.Errorf("section %s not found", sidStr)
			}

			// Deadline check
			if time.Now().After(sec.Deadline) {
				return fmt.Errorf("Course %s deadline passed", sec.CourseID)
			}

			// Allowed majors check

			totalCredits += sec.Course.Credits
		}

		if totalCredits > 22 {
			return fmt.Errorf("total credits exceeded for major %s", std.Major)
		}

		// Remove old enrollments that are not in newSids
		for sidStr, en := range oldMap {
			if !newMap[sidStr] {
				key := fmt.Sprintf("section:%s:seats", sidStr)
				s.rdb.Incr(ctx, key)

				// Hard delete
				tx.Unscoped().Delete(&en)

				tx.Model(&models.Section{}).Where("id = ?", en.SectionID).Update("enrolled", gorm.Expr("enrolled - 1"))
			}
		}

		for sidStr := range newMap {
			// if it's new course, steal a seat
			if _, exists := oldMap[sidStr]; !exists {
				key := fmt.Sprintf("section:%s:seats", sidStr)

				remaining, _ := s.rdb.Decr(ctx, key).Result()
				if remaining < 0 {
					s.rdb.Incr(ctx, key)
					return fmt.Errorf("section %s is full", sidStr)
				}

				// Save to db
				sid, _ := uuid.Parse(sidStr)
				var sec models.Section
				tx.First(&sec, "id = ?", sid)
				tx.Create(&models.Enrollment{
					StudentID:    std.StudentID,
					SectionID:    sid,
					Status:       "enrolled",
					Semester:     sec.Semester,
					AcademicYear: sec.AcademicYear,
				})
				tx.Model(&sec).Update("enrolled", gorm.Expr("enrolled + 1"))
			}
		}

		return nil
	})
}

func (s *EnrollService) WithdrawCourse(studentID uuid.UUID, sectionID uuid.UUID) error {
	return s.db.Transaction(func(tx *gorm.DB) error {
		var en models.Enrollment
		err := tx.Preload("Section").Where("student_id = ? AND section_id = ? AND status = ?", studentID, sectionID, "enrolled").First(&en).Error
		if err != nil {
			return errors.New("No enrollment found that can be withdrawn")
		}

		// Check before deadline
		if time.Now().Before(en.Section.Deadline) {
			return errors.New("Cannot withdraw course before deadline")
		}

		en.Status = "withdrawn"
		if err := tx.Save(&en).Error; err != nil {
			return err
		}

		return nil
	})
}

func (s *EnrollService) GetMyEnrollments(studentID uuid.UUID, mode string) ([]dto.EnrolledCourseResponse, error) {
	var std models.Student
	if err := s.db.First(&std, "id = ?", studentID).Error; err != nil {
		return nil, errors.New("student not found")
	}

	var enrolls []models.Enrollment
	query := s.db.Preload("Section.Course").Where("student_id = ?", std.StudentID)

	// cases for UI
	switch mode {
	case "active":
		query = query.Where("status = ?", "enrolled")
	case "withdrawable":
		query = query.Where("status = ? AND EXISTS (SELECT 1 FROM sections WHERE sections.id = enrollments.section_id AND sections.deadline < ?)", "enrolled", time.Now())
	case "all":
	}

	err := query.Find(&enrolls).Error
	if err != nil {
		return nil, err
	}

	var res []dto.EnrolledCourseResponse
	for _, enroll := range enrolls {
		res = append(res, dto.EnrolledCourseResponse{
			EnrollmentID: enroll.ID.String(),
			CourseID:     enroll.Section.Course.ID,
			CourseName:   enroll.Section.Course.NameEn,
			SectionNum:   enroll.Section.SectionNum,
			Semester:     enroll.Semester,
			AcademicYear: enroll.AcademicYear,
		})
	}
	return res, nil
}
