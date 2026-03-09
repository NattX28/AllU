package services

import (
	"context"
	"fmt"
	"time"

	"github.com/NattX28/AllU/internal/dto"
	"github.com/NattX28/AllU/internal/models"
	"github.com/redis/go-redis/v9"
	"gorm.io/gorm"
)

type CourseService struct {
	db  *gorm.DB
	rdb *redis.Client
}

func NewCourseService(db *gorm.DB, rdb *redis.Client) *CourseService {
	return &CourseService{
		db:  db,
		rdb: rdb,
	}
}

func (s *CourseService) CreateCourse(req dto.CreateCourseRequest) error {
	return s.db.Transaction(func(tx *gorm.DB) error {
		var prereqs []models.Course
		if len(req.PrerequisiteIDs) > 0 {
			if err := tx.Where("id IN ?", req.PrerequisiteIDs).Find(&prereqs).Error; err != nil {
				return err
			}
		}

		newCourse := models.Course{
			ID:             req.ID,
			NameTh:         req.NameTh,
			NameEn:         req.NameEn,
			Credits:        req.Credits,
			Category:       models.CourseCategory(req.Category),
			MaxEntryYear:   req.MaxEntryYear,
			LectureHours:   req.LectureHours,
			LabHours:       req.LabHours,
			SelfStudyHours: req.SelfStudyHours,
			Prerequisites:  prereqs,
		}
		return tx.Create(&newCourse).Error
	})
}

func (s *CourseService) CreateSection(req dto.CreateSectionRequest) error {
	deadline, _ := time.Parse("2006-01-02", req.Deadline)

	return s.db.Transaction(func(tx *gorm.DB) error {
		newSection := models.Section{
			CourseID:    req.CourseID,
			SectionNum:  req.SectionNum,
			Capacity:    req.Capacity,
			Enrolled:    0,
			StudyTime:   req.StudyTime,
			Deadline:    deadline,
			ProfessorID: req.ProfessorID,
		}

		if err := tx.Create(&newSection).Error; err != nil {
			return err
		}

		// Sync seats to Redis
		// Key: section:{uuid}:seats
		ctx := context.Background()
		key := fmt.Sprintf("section:%s:seats", newSection.ID)

		// Set initial seat capacity in Redis(source of truth for seat availability)
		if err := s.rdb.Set(ctx, key, newSection.Capacity, 0).Err(); err != nil {
			return fmt.Errorf("failed to sync redis seats: %v", err)
		}
		return nil
	})
}
