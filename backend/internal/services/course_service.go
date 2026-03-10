package services

import (
	"context"
	"errors"
	"fmt"
	"log"
	"time"

	"github.com/NattX28/AllU/internal/dto"
	"github.com/NattX28/AllU/internal/models"
	"github.com/google/uuid"
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
			CourseID:     req.CourseID,
			SectionNum:   req.SectionNum,
			Semester:     req.Semester,
			AcademicYear: req.AcademicYear,
			Capacity:     req.Capacity,
			Enrolled:     0,
			StudyTime:    req.StudyTime,
			Deadline:     deadline,
			ProfessorID:  req.ProfessorID,
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

func (s *CourseService) UpdateCourse(id string, req dto.UpdateCourseRequest) error {
	return s.db.Transaction(func(tx *gorm.DB) error {
		var course models.Course
		if err := tx.First(&course, "id = ?", id).Error; err != nil {
			return err
		}

		// Update basic fields
		if req.NameTh != nil {
			course.NameTh = *req.NameTh
		}
		if req.NameEn != nil {
			course.NameEn = *req.NameEn
		}
		if req.Credits != nil {
			course.Credits = *req.Credits
		}
		if req.Category != nil {
			course.Category = models.CourseCategory(*req.Category)
		}
		if req.MaxEntryYear != nil {
			course.MaxEntryYear = *req.MaxEntryYear
		}
		if req.LectureHours != nil {
			course.LectureHours = *req.LectureHours
		}
		if req.LabHours != nil {
			course.LabHours = *req.LabHours
		}
		if req.SelfStudyHours != nil {
			course.SelfStudyHours = *req.SelfStudyHours
		}

		// Association Replace for Prerequisites(Many-toMany)
		if req.PrerequisiteIDs != nil {
			var prereqs []models.Course
			if len(req.PrerequisiteIDs) > 0 {
				tx.Where("id IN ?", req.PrerequisiteIDs).Find(&prereqs)

				if len(prereqs) != len(req.PrerequisiteIDs) {
					return errors.New("Some prerequisite IDs are not in the system, please check and try again")
				}
			}

			// Delete old and store in new join table
			if err := tx.Model(&course).Association("Prerequisites").Replace(prereqs); err != nil {
				return err
			}
		}
		return tx.Save(&course).Error
	})
}

func (s *CourseService) DeleteCourse(id string) error {
	return s.db.Transaction(func(tx *gorm.DB) error {
		var course models.Course
		if err := tx.First(&course, "id = ?", id).Error; err != nil {
			return err
		}

		// Check dependencies
		count := tx.Model(&course).Association("Sections").Count()
		if count > 0 {
			return fmt.Errorf("cannot delete course %s with sections because it has %d sections", id, count)
		}

		// Clear relations
		if err := tx.Model(&course).Association("Prerequisites").Clear(); err != nil {
			return err
		}

		// Soft delete
		if err := tx.Delete(&course).Error; err != nil {
			return err
		}

		return nil
	})
}

func (s *CourseService) UpdateSection(id uuid.UUID, req dto.UpdateSectionRequest) error {
	var diff int64
	var shouldUpdateRedis bool
	var sectionID string

	err := s.db.Transaction(func(tx *gorm.DB) error {
		var section models.Section
		if err := tx.First(&section, "id = ?", id).Error; err != nil {
			return err
		}

		// If has update Capacity
		if req.Capacity != nil {
			diff = int64(*req.Capacity - section.Capacity)
			section.Capacity = *req.Capacity
			shouldUpdateRedis = true
			sectionID = section.ID.String()
		}

		// Update basic fields
		if req.SectionNum != nil {
			section.SectionNum = *req.SectionNum
		}
		if req.StudyTime != nil {
			section.StudyTime = *req.StudyTime
		}
		if req.Deadline != nil {
			parsedTime, err := time.Parse("2006-01-02 15:04:05", *req.Deadline)
			if err != nil {
				return fmt.Errorf("invalid deadline format: %v", err)
			}
			section.Deadline = parsedTime
		}
		if req.ProfessorID != nil {
			section.ProfessorID = *req.ProfessorID
		}

		return tx.Save(&section).Error
	})

	if err == nil && shouldUpdateRedis {
		// Update in Redis
		ctx := context.Background()
		key := fmt.Sprintf("section:%s:seats", sectionID)

		if rerr := s.rdb.IncrBy(ctx, key, diff).Err(); rerr != nil {
			log.Println("Warning: Failed to update Redis seats")
		}
	}
	return err
}

func (s *CourseService) DeleteSection(id uuid.UUID) error {
	return s.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Delete(&models.Section{}, "id = ?", id).Error; err != nil {
			return err
		}

		// Instantly delete from cache
		ctx := context.Background()
		key := fmt.Sprintf("section:%s:seats", id)
		return s.rdb.Del(ctx, key).Err()
	})
}

func (s *CourseService) GetAllCourses() ([]dto.CourseResponse, error) {
	var courses []models.Course
	ctx := context.Background()

	// Get courses from database(join 3 tables)
	err := s.db.Preload("Sections.Professor.User").Find(&courses).Error
	if err != nil {
		return nil, err
	}

	var response []dto.CourseResponse

	// loop for each course
	for _, c := range courses {
		var sections []dto.SectionResponse

		for _, sec := range c.Sections {
			key := fmt.Sprintf("section:%s:seats", sec.ID)

			val, err := s.rdb.Get(ctx, key).Int()
			if err != nil {
				// Default to capacity - enrolled(DB) if Redis lookup fails
				val = sec.Capacity - sec.Enrolled
			}

			sections = append(sections, dto.SectionResponse{
				ID:            sec.ID,
				SectionNum:    sec.SectionNum,
				Capacity:      sec.Capacity,
				Available:     val,
				StudyTime:     sec.StudyTime,
				ProfessorName: sec.Professor.User.Name,
			})
		}

		response = append(response, dto.CourseResponse{
			ID:       c.ID,
			NameTh:   c.NameTh,
			NameEn:   c.NameEn,
			Credits:  c.Credits,
			Sections: sections,
		})
	}

	return response, nil
}

func (s *CourseService) GetCourseByID(id string) (*dto.CourseDetailResponse, error) {
	var course models.Course
	ctx := context.Background()

	// retreive course + prerequisites + sections + professor
	err := s.db.Preload("Prerequisites").Preload("Sections.Professor.User").First(&course, "id = ?", id).Error

	if err != nil {
		return nil, err
	}

	// retreive sections seats from redis
	var sections []dto.SectionResponse
	for _, sec := range course.Sections {
		key := fmt.Sprintf("section:%s:seats", sec.ID)

		val, err := s.rdb.Get(ctx, key).Int()
		if err != nil {
			val = sec.Capacity - sec.Enrolled
		}

		sections = append(sections, dto.SectionResponse{
			ID:            sec.ID,
			SectionNum:    sec.SectionNum,
			Capacity:      sec.Capacity,
			Available:     val,
			StudyTime:     sec.StudyTime,
			ProfessorName: sec.Professor.User.Name,
		})
	}

	// Map prerequisites to dto.PrereqResponse
	var prereqs []dto.PrereqResponse
	for _, prereq := range course.Prerequisites {
		prereqs = append(prereqs, dto.PrereqResponse{
			ID:     prereq.ID,
			NameTh: prereq.NameTh,
			NameEn: prereq.NameEn,
		})
	}

	return &dto.CourseDetailResponse{
		ID:            course.ID,
		NameTh:        course.NameTh,
		NameEn:        course.NameEn,
		Credits:       course.Credits,
		Description:   course.Description,
		Category:      string(course.Category),
		Prerequisites: prereqs,
		Sections:      sections,
	}, nil
}
