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
				en.AttendanceScore = item.AttendanceScore
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

			// update GPAX after each enrollment is saved

			if item.Grade != "" {
				if err := s.UpdateGPAXLogic(tx, en.StudentID); err != nil {
					return err
				}
			}
		}
		return nil
	})
}

func (s *GradeService) GetClassList(profID uuid.UUID, sectionID uuid.UUID) (*dto.ClassListResponse, error) {
	var section models.Section
	if err := s.db.Preload("Course").Where("id =? AND professor_id = ?", sectionID, profID).First(&section).Error; err != nil {
		return nil, errors.New("section not found or professor does not own the section")
	}

	// retrieve student that status is 'enrolled' or 'graded' or 'dropped'
	var enrolls []models.Enrollment
	err := s.db.Preload("Student.User").Where("section_id = ?", sectionID).Find(&enrolls).Error

	if err != nil {
		return nil, err
	}

	studentItems := make([]dto.StudentGradeItem, 0)
	for _, en := range enrolls {
		studentItems = append(studentItems, dto.StudentGradeItem{
			EnrollmentID:    en.ID,
			StudentID:       en.Student.StudentID,
			StudentName:     en.Student.User.Name,
			AttendanceScore: en.AttendanceScore,
			AssignmentScore: en.AssignmentScore,
			MidtermScore:    en.MidtermScore,
			FinalScore:      en.FinalScore,
			TotalScore:      en.TotalScore,
			Grade:           en.LetterGrade,
			Status:          string(en.Status),
		})
	}
	return &dto.ClassListResponse{
		SectionID:    sectionID,
		CourseID:     section.Course.ID,
		SectionNum:   section.SectionNum,
		TotalStudent: len(enrolls),
		Students:     studentItems,
	}, nil
}

func (s *GradeService) GetMyGrades(studentID uuid.UUID, semester, year int) (*dto.MyGradesResponse, error) {
	// Auto detect if semester and year are not provided
	if semester == 0 || year == 0 {
		// Get the latest semester and year
		var lastest models.Enrollment
		if err := s.db.Where("student_id = ?", studentID).Order("academic_year DESC, semester DESC").First(&lastest).Error; err != nil {
			return &dto.MyGradesResponse{Courses: []dto.GradeDetails{}}, nil
		}
		semester = lastest.Semester
		year = lastest.AcademicYear
	}

	// Get enrollments for the student in the given semester and year
	var enrolls []models.Enrollment
	err := s.db.Preload("Section.Course").Where("student_id = ? AND academic_year = ? AND semester = ?", studentID, year, semester).Find(&enrolls).Error
	if err != nil {
		return nil, err
	}

	var courses []dto.GradeDetails
	var totalQualityPoints float64
	var totalCreditsForGPA int

	for _, en := range enrolls {
		courses = append(courses, dto.GradeDetails{
			CourseID:   en.Section.CourseID,
			CourseName: en.Section.Course.NameEn,
			Credits:    en.Section.Course.Credits,
			Attendance: en.AttendanceScore,
			Assignment: en.AssignmentScore,
			Midterm:    en.MidtermScore,
			Final:      en.FinalScore,
			Total:      en.TotalScore,
			Grade:      en.LetterGrade,
		})

		// Calculate GPA
		if en.Status == "graded" && en.LetterGrade != "" && en.LetterGrade != "W" && en.LetterGrade != "I" {
			weight := s.ConvertGradeToWeight(en.LetterGrade)
			totalQualityPoints += weight * float64(en.Section.Course.Credits)
			totalCreditsForGPA += en.Section.Course.Credits
		}
	}

	var TermGPA float64
	if totalCreditsForGPA > 0 {
		TermGPA = totalQualityPoints / float64(totalCreditsForGPA)
	}
	return &dto.MyGradesResponse{
		Semester:     semester,
		AcademicYear: year,
		TermGPA:      TermGPA,
		TotalCredits: totalCreditsForGPA,
		Courses:      courses,
	}, nil
}

func (s *GradeService) ConvertGradeToWeight(grade string) float64 {
	weights := map[string]float64{
		"A":  4.0,
		"B+": 3.5,
		"B":  3.0,
		"C+": 2.5,
		"C":  2.0,
		"D+": 1.5,
		"D":  1.0,
		"F":  0.0,
	}
	return weights[grade]
}

func (s *GradeService) UpdateGPAXLogic(tx *gorm.DB, studentID string) error {
	var enrolls []models.Enrollment

	// retrieve enrollments that 'graded'
	err := tx.Preload("Section.Course").Where("student_id = ? AND status = ?", studentID, "graded").Find(&enrolls).Error
	if err != nil {
		return err
	}

	var totalQualityPoints float64
	var totalCreditsForGPAX int

	for _, en := range enrolls {
		if en.LetterGrade != "" && en.LetterGrade != "W" && en.LetterGrade != "I" {
			weight := s.ConvertGradeToWeight(en.LetterGrade)
			totalQualityPoints += weight * float64(en.Section.Course.Credits)
			totalCreditsForGPAX += en.Section.Course.Credits
		}
	}

	// Calculate GPAX
	var gpax float64
	if totalCreditsForGPAX > 0 {
		gpax = totalQualityPoints / float64(totalCreditsForGPAX)
	}

	return tx.Model(&models.Student{}).Where("student_id = ?", studentID).Update("gpax", gpax).Error

}
