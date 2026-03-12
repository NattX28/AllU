package services

import (
	"github.com/NattX28/AllU/internal/dto"
	"github.com/NattX28/AllU/internal/models"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type GradeService struct {
	db *gorm.DB
}

func NewGradeService(db *gorm.DB) *GradeService {
	return &GradeService{db: db}
}

func (s *GradeService) GetProfessorSections(profID uuid.UUID) ([]dto.ProfessorSectionResponse, error) {
	var sections []models.Section

	// query all section that this professor teach
	err := s.db.Preload("Course").Where("professor_id = ?", profID).Find(&sections).Error
	if err != nil {
		return nil, err
	}

	var res []dto.ProfessorSectionResponse
	for _, sec := range sections {
		res = append(res, dto.ProfessorSectionResponse{
			SectionID:    sec.ID,
			CourseID:     sec.CourseID,
			CourseName:   sec.Course.NameEn,
			SectionNum:   sec.SectionNum,
			TotalStudent: sec.Enrolled,
			Semester:     sec.Semester,
			AcademicYear: sec.AcademicYear,
		})
	}

	return res, nil
}
