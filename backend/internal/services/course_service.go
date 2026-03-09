package services

import (
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
