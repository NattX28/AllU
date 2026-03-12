package services

import (
	"errors"

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

func (s *GradeService) SubmitGrades(profID uuid.UUID, req dto.SubmitGradeRequest) error {
	return s.db.Transaction(func(tx *gorm.DB) error {
		// Check professor
		var section models.Section
		if err := tx.Where("id = ? AND professor_id = ?", req.SectionID, profID).First(&section).Error; err != nil {
			return errors.New("section not found or professor does not own the section")
		}

		// Bulk update grade
		for _, item := range req.Grades {
			// find enrollment by enrollment_id
			var en models.Enrollment
			if err := tx.Where("id = ? AND section_id = ?", item.EnrollmentID, req.SectionID).First(&en).Error; err != nil {
				return err
			}

			// Update scores only professor sent
			if item.AttendanceScore != nil {
				en.AssignmentScore = item.AttendanceScore
			}
			if item.AssignmentScore != nil {
				en.AssignmentScore = item.AssignmentScore
			}
			if item.MidtermScore != nil {
				en.MidtermScore = item.MidtermScore
			}
			if item.FinalScore != nil {
				en.FinalScore = item.FinalScore
			}

			// calculate total score and grade
			var total float64
			if en.AttendanceScore != nil {
				total += *en.AttendanceScore
			}
			if en.AssignmentScore != nil {
				total += *en.AssignmentScore
			}
			if en.MidtermScore != nil {
				total += *en.MidtermScore
			}
			if en.FinalScore != nil {
				total += *en.FinalScore
			}

			en.TotalScore = total

			if item.Grade != "" {
				en.LetterGrade = item.Grade
				en.Status = "graded"
			}

			if err := tx.Save(&en).Error; err != nil {
				return err
			}
		}
		return nil
	})
}
