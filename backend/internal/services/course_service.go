package services

import (
	"context"
	"errors"
	"fmt"
	"log"

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
	return &CourseService{db: db, rdb: rdb}
}

// ─── Course ───

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

func (s *CourseService) UpdateCourse(id string, req dto.UpdateCourseRequest) error {
	return s.db.Transaction(func(tx *gorm.DB) error {
		var course models.Course
		if err := tx.First(&course, "id = ?", id).Error; err != nil {
			return err
		}

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

		if req.PrerequisiteIDs != nil {
			var prereqs []models.Course
			if len(req.PrerequisiteIDs) > 0 {
				tx.Where("id IN ?", req.PrerequisiteIDs).Find(&prereqs)
				if len(prereqs) != len(req.PrerequisiteIDs) {
					return errors.New("some prerequisite IDs are not in the system, please check and try again")
				}
			}
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

		count := tx.Model(&course).Association("Sections").Count()
		if count > 0 {
			return fmt.Errorf("cannot delete course %s: it still has %d section(s)", id, count)
		}

		if err := tx.Model(&course).Association("Prerequisites").Clear(); err != nil {
			return err
		}

		return tx.Delete(&course).Error
	})
}

// ─── Section ───

func (s *CourseService) CreateSection(req dto.CreateSectionRequest) error {
	return s.db.Transaction(func(tx *gorm.DB) error {
		newSection := models.Section{
			CourseID:     req.CourseID,
			SectionNum:   req.SectionNum,
			Semester:     req.Semester,
			AcademicYear: req.AcademicYear,
			Capacity:     req.Capacity,
			Enrolled:     0,
			ProfessorID:  req.ProfessorID,
		}

		if err := tx.Create(&newSection).Error; err != nil {
			return err
		}

		for _, sch := range req.Schedules {
			schedule := models.SectionSchedule{
				SectionID: newSection.ID,
				Day:       sch.Day,
				StartTime: sch.StartTime,
				EndTime:   sch.EndTime,
				Room:      sch.Room,
				Type:      sch.Type,
			}
			if err := tx.Create(&schedule).Error; err != nil {
				return fmt.Errorf("failed to create schedule: %w", err)
			}
		}

		ctx := context.Background()
		key := fmt.Sprintf("section:%s:seats", newSection.ID)
		if err := s.rdb.Set(ctx, key, newSection.Capacity, 0).Err(); err != nil {
			return fmt.Errorf("failed to sync redis seats: %w", err)
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

		if req.Capacity != nil {
			diff = int64(*req.Capacity - section.Capacity)
			section.Capacity = *req.Capacity
			shouldUpdateRedis = true
			sectionID = section.ID.String()
		}
		if req.SectionNum != nil {
			section.SectionNum = *req.SectionNum
		}
		if req.ProfessorID != nil {
			section.ProfessorID = *req.ProfessorID
		}

		if err := tx.Save(&section).Error; err != nil {
			return err
		}

		if len(req.Schedules) > 0 {
			if err := tx.Where("section_id = ?", id).Delete(&models.SectionSchedule{}).Error; err != nil {
				return fmt.Errorf("failed to clear old schedules: %w", err)
			}
			for _, sch := range req.Schedules {
				schedule := models.SectionSchedule{
					SectionID: id,
					Day:       sch.Day,
					StartTime: sch.StartTime,
					EndTime:   sch.EndTime,
					Room:      sch.Room,
					Type:      sch.Type,
				}
				if err := tx.Create(&schedule).Error; err != nil {
					return fmt.Errorf("failed to create schedule: %w", err)
				}
			}
		}

		return nil
	})

	if err == nil && shouldUpdateRedis {
		ctx := context.Background()
		key := fmt.Sprintf("section:%s:seats", sectionID)
		if rerr := s.rdb.IncrBy(ctx, key, diff).Err(); rerr != nil {
			log.Println("Warning: failed to update Redis seats for section", sectionID)
		}
	}

	return err
}

func (s *CourseService) DeleteSection(id uuid.UUID) error {
	return s.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("section_id = ?", id).Delete(&models.SectionSchedule{}).Error; err != nil {
			return fmt.Errorf("failed to delete schedules: %w", err)
		}

		if err := tx.Delete(&models.Section{}, "id = ?", id).Error; err != nil {
			return err
		}

		ctx := context.Background()
		key := fmt.Sprintf("section:%s:seats", id)
		return s.rdb.Del(ctx, key).Err()
	})
}

// ─── Query ───

func (s *CourseService) GetAllCourses() ([]dto.CourseResponse, error) {
	var courses []models.Course
	ctx := context.Background()

	err := s.db.
		Preload("Sections", func(db *gorm.DB) *gorm.DB {
			return db.Preload("Schedules")
		}).
		Find(&courses).Error
	if err != nil {
		return nil, err
	}

	var response []dto.CourseResponse
	for _, c := range courses {
		response = append(response, dto.CourseResponse{
			ID:       c.ID,
			NameTh:   c.NameTh,
			NameEn:   c.NameEn,
			Credits:  c.Credits,
			Category: string(c.Category),
			Sections: s.mapSections(ctx, c.Sections),
		})
	}

	return response, nil
}

func (s *CourseService) GetCourseByID(id string) (*dto.CourseDetailResponse, error) {
	var course models.Course
	ctx := context.Background()

	err := s.db.
		Preload("Prerequisites").
		Preload("Sections", func(db *gorm.DB) *gorm.DB {
			return db.Preload("Schedules")
		}).
		First(&course, "id = ?", id).Error
	if err != nil {
		return nil, err
	}

	var prereqs []dto.PrereqResponse
	for _, p := range course.Prerequisites {
		prereqs = append(prereqs, dto.PrereqResponse{
			ID:     p.ID,
			NameTh: p.NameTh,
			NameEn: p.NameEn,
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
		Sections:      s.mapSections(ctx, course.Sections),
	}, nil
}

// ─── Helper ───

func (s *CourseService) mapSections(ctx context.Context, sections []models.Section) []dto.SectionResponse {
	if len(sections) == 0 {
		return nil
	}

	// รวบรวม professor IDs ที่ไม่ซ้ำกัน
	profIDSet := make(map[uuid.UUID]struct{})
	for _, sec := range sections {
		profIDSet[sec.ProfessorID] = struct{}{}
	}
	profIDs := make([]uuid.UUID, 0, len(profIDSet))
	for id := range profIDSet {
		profIDs = append(profIDs, id)
	}

	// Query professors ทั้งหมดในครั้งเดียว
	var profs []models.Professor
	s.db.Preload("User").Where("id IN ?", profIDs).Find(&profs)

	// Map สำหรับ lookup
	profMap := make(map[uuid.UUID]models.Professor, len(profs))
	for _, p := range profs {
		profMap[p.ID] = p
	}

	var result []dto.SectionResponse
	for _, sec := range sections {
		key := fmt.Sprintf("section:%s:seats", sec.ID)
		available, err := s.rdb.Get(ctx, key).Int()
		if err != nil {
			available = sec.Capacity - sec.Enrolled
		}

		prof := profMap[sec.ProfessorID]

		var schedules []dto.ScheduleResponse
		for _, sch := range sec.Schedules {
			schedules = append(schedules, dto.ScheduleResponse{
				ID:        sch.ID,
				Day:       sch.Day,
				StartTime: sch.StartTime,
				EndTime:   sch.EndTime,
				Room:      sch.Room,
				Type:      sch.Type,
			})
		}

		result = append(result, dto.SectionResponse{
			ID:                 sec.ID,
			SectionNum:         sec.SectionNum,
			Semester:           sec.Semester,
			AcademicYear:       sec.AcademicYear,
			Capacity:           sec.Capacity,
			Available:          available,
			ProfessorName:      prof.User.Name,
			ProfessorProfileID: sec.ProfessorID.String(),
			Schedules:          schedules,
		})
	}
	return result
}
