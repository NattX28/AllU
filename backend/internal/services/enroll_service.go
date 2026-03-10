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
		if err := tx.First(&std, "student_id = ?", studentID).Error; err != nil {
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
				StudentID:    studentID,
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
