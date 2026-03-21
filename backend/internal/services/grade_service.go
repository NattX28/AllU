package services

import (
	"errors"
	"fmt"
	"math"

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

// ─── Helpers ────────────────────────────────────────────────

// calcWeightedTotal รวมคะแนนดิบ ซึ่งก็คือ total จริงในระบบ 100 คะแนน
// เพราะ max แต่ละหมวดรวมกันเป็น 100 อยู่แล้ว (10+20+30+40)
// ตัวอย่าง: 8 + 15 + 25 + 32 = 80
func calcWeightedTotal(en models.Enrollment) float64 {
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
	return math.Round(total*100) / 100
}

func isScoreComplete(en models.Enrollment) bool {
	return en.AttendanceScore != nil &&
		en.AssignmentScore != nil &&
		en.MidtermScore != nil &&
		en.FinalScore != nil
}

func letterGradeFromTotal(total float64) string {
	switch {
	case total >= 80:
		return "A"
	case total >= 75:
		return "B+"
	case total >= 70:
		return "B"
	case total >= 65:
		return "C+"
	case total >= 60:
		return "C"
	case total >= 55:
		return "D+"
	case total >= 50:
		return "D"
	default:
		return "F"
	}
}

func numericGradeFromLetter(grade string) float64 {
	weights := map[string]float64{
		"A": 4.0, "B+": 3.5, "B": 3.0,
		"C+": 2.5, "C": 2.0, "D+": 1.5,
		"D": 1.0, "F": 0.0,
	}
	return weights[grade]
}

// ─── Professor: sections ─────────────────────────────────────

func (s *GradeService) GetProfessorSections(profID uuid.UUID) ([]dto.ProfessorSectionResponse, error) {
	var sections []models.Section
	if err := s.db.Preload("Course").Where("professor_id = ?", profID).Find(&sections).Error; err != nil {
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

// ─── Professor: class list ───────────────────────────────────

func (s *GradeService) GetClassList(profID uuid.UUID, sectionID uuid.UUID) (*dto.ClassListResponse, error) {
	var section models.Section
	if err := s.db.Preload("Course").
		Where("id = ? AND professor_id = ?", sectionID, profID).
		First(&section).Error; err != nil {
		return nil, errors.New("section not found or professor does not own the section")
	}

	var enrolls []models.Enrollment
	if err := s.db.Preload("Student.User").
		Where("section_id = ?", sectionID).
		Find(&enrolls).Error; err != nil {
		return nil, err
	}

	items := make([]dto.StudentGradeItem, 0, len(enrolls))
	for _, en := range enrolls {
		items = append(items, dto.StudentGradeItem{
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
		Students:     items,
	}, nil
}

// ─── Professor: save scores ──────────────────────────────────

func (s *GradeService) SaveScores(profID uuid.UUID, req dto.SaveScoresRequest) error {
	return s.db.Transaction(func(tx *gorm.DB) error {
		var section models.Section
		if err := tx.Where("id = ? AND professor_id = ?", req.SectionID, profID).
			First(&section).Error; err != nil {
			return errors.New("section not found or professor does not own the section")
		}

		for _, item := range req.Grades {
			var en models.Enrollment
			if err := tx.Where("id = ? AND section_id = ?", item.EnrollmentID, req.SectionID).
				First(&en).Error; err != nil {
				return fmt.Errorf("enrollment %s not found", item.EnrollmentID)
			}

			if item.AttendanceScore != nil {
				if *item.AttendanceScore < 0 || *item.AttendanceScore > 10 {
					return fmt.Errorf("attendance score %.2f exceeds max 10 for student %s", *item.AttendanceScore, item.StudentID)
				}
				en.AttendanceScore = item.AttendanceScore
			}
			if item.AssignmentScore != nil {
				if *item.AssignmentScore < 0 || *item.AssignmentScore > 20 {
					return fmt.Errorf("assignment score %.2f exceeds max 20 for student %s", *item.AssignmentScore, item.StudentID)
				}
				en.AssignmentScore = item.AssignmentScore
			}
			if item.MidtermScore != nil {
				if *item.MidtermScore < 0 || *item.MidtermScore > 30 {
					return fmt.Errorf("midterm score %.2f exceeds max 30 for student %s", *item.MidtermScore, item.StudentID)
				}
				en.MidtermScore = item.MidtermScore
			}
			if item.FinalScore != nil {
				if *item.FinalScore < 0 || *item.FinalScore > 40 {
					return fmt.Errorf("final score %.2f exceeds max 40 for student %s", *item.FinalScore, item.StudentID)
				}
				en.FinalScore = item.FinalScore
			}

			en.TotalScore = calcWeightedTotal(en)

			if err := tx.Save(&en).Error; err != nil {
				return err
			}
		}
		return nil
	})
}

// ─── Professor: commit grades ────────────────────────────────

func (s *GradeService) CommitGrades(profID uuid.UUID, req dto.CommitGradeRequest) (*dto.CommitGradeResponse, error) {
	var committed, skipped int

	err := s.db.Transaction(func(tx *gorm.DB) error {
		var section models.Section
		if err := tx.Where("id = ? AND professor_id = ?", req.SectionID, profID).
			First(&section).Error; err != nil {
			return errors.New("section not found or professor does not own the section")
		}

		var enrolls []models.Enrollment
		query := tx.Where("section_id = ?", req.SectionID)
		if !req.CommitAll {
			if len(req.EnrollmentIDs) == 0 {
				return errors.New("enrollment_ids must not be empty when commit_all is false")
			}
			query = query.Where("id IN ?", req.EnrollmentIDs)
		}
		if err := query.Find(&enrolls).Error; err != nil {
			return err
		}

		for _, en := range enrolls {
			if !isScoreComplete(en) {
				skipped++
				continue
			}

			total := calcWeightedTotal(en)
			grade := letterGradeFromTotal(total)

			en.TotalScore = total
			en.LetterGrade = grade
			en.NumericGrade = numericGradeFromLetter(grade)
			en.Status = models.StatusGraded

			if err := tx.Save(&en).Error; err != nil {
				return err
			}

			if err := s.UpdateGPAXLogic(tx, en.StudentID); err != nil {
				return err
			}

			committed++
		}
		return nil
	})

	if err != nil {
		return nil, err
	}

	msg := fmt.Sprintf("ตัดเกรดสำเร็จ %d คน", committed)
	if skipped > 0 {
		msg += fmt.Sprintf(", ข้าม %d คน (คะแนนไม่ครบ)", skipped)
	}

	return &dto.CommitGradeResponse{
		Committed: committed,
		Skipped:   skipped,
		Message:   msg,
	}, nil
}

// ─── Student: my grades ──────────────────────────────────────

func (s *GradeService) GetMyGrades(studentID uuid.UUID, semester, year int) (*dto.MyGradesResponse, error) {
	var std models.Student
	if err := s.db.First(&std, "id = ?", studentID).Error; err != nil {
		return nil, errors.New("student not found")
	}

	if semester == 0 || year == 0 {
		var latest models.Enrollment
		if err := s.db.Where("student_id = ?", std.StudentID).
			Order("academic_year DESC, semester DESC").
			First(&latest).Error; err != nil {
			return &dto.MyGradesResponse{Courses: []dto.GradeDetails{}}, nil
		}
		semester = latest.Semester
		year = latest.AcademicYear
	}

	var enrolls []models.Enrollment
	if err := s.db.Preload("Section.Course").
		Where("student_id = ? AND academic_year = ? AND semester = ?", std.StudentID, year, semester).
		Find(&enrolls).Error; err != nil {
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

		if en.Status == models.StatusGraded &&
			en.LetterGrade != "" &&
			en.LetterGrade != "W" &&
			en.LetterGrade != "I" {
			weight := numericGradeFromLetter(en.LetterGrade)
			totalQualityPoints += weight * float64(en.Section.Course.Credits)
			totalCreditsForGPA += en.Section.Course.Credits
		}
	}

	var termGPA float64
	if totalCreditsForGPA > 0 {
		termGPA = totalQualityPoints / float64(totalCreditsForGPA)
	}

	return &dto.MyGradesResponse{
		Semester:     semester,
		AcademicYear: year,
		TermGPA:      termGPA,
		TotalCredits: totalCreditsForGPA,
		Courses:      courses,
	}, nil
}

// ─── GPAX ────────────────────────────────────────────────────

func (s *GradeService) ConvertGradeToWeight(grade string) float64 {
	return numericGradeFromLetter(grade)
}

func (s *GradeService) UpdateGPAXLogic(tx *gorm.DB, studentID string) error {
	var enrolls []models.Enrollment
	if err := tx.Preload("Section.Course").
		Where("student_id = ? AND status = ?", studentID, models.StatusGraded).
		Find(&enrolls).Error; err != nil {
		return err
	}

	var totalQualityPoints float64
	var totalCredits int

	for _, en := range enrolls {
		if en.LetterGrade != "" && en.LetterGrade != "W" && en.LetterGrade != "I" {
			weight := numericGradeFromLetter(en.LetterGrade)
			totalQualityPoints += weight * float64(en.Section.Course.Credits)
			totalCredits += en.Section.Course.Credits
		}
	}

	var gpax float64
	if totalCredits > 0 {
		gpax = totalQualityPoints / float64(totalCredits)
	}

	return tx.Model(&models.Student{}).
		Where("student_id = ?", studentID).
		Update("gpax", gpax).Error
}
