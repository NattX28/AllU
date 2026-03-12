package dto

import "github.com/google/uuid"

type ProfessorSectionResponse struct {
	SectionID    uuid.UUID `json:"section_id"`
	CourseID     string    `json:"course_id"`
	CourseName   string    `json:"course_name"`
	SectionNum   int       `json:"section_num"`
	TotalStudent int       `json:"total_student"`
	Semester     int       `json:"semester"`
	AcademicYear int       `json:"academic_year"`
}

type StudentGradeItem struct {
	EnrollmentID    uuid.UUID `json:"enrollment_id"`
	StudentID       string    `json:"student_id"` // ex. 66040626...
	StudentName     string    `json:"student_name"`
	AttendanceScore *float64  `json:"attendance_score" validate:"omitempty,min=0,max=100"`
	AssignmentScore *float64  `json:"assignment_score" validate:"omitempty,min=0,max=100"`
	MidtermScore    *float64  `json:"midterm_score"    validate:"omitempty,min=0,max=100"`
	FinalScore      *float64  `json:"final_score"      validate:"omitempty,min=0,max=100"`
	TotalScore      float64   `json:"total_score"      validate:"min=0,max=100"`
	Grade           string    `json:"grade"            validate:"omitempty,oneof=A B+ B C+ C D+ D F I W"`
	Status          string    `json:"status"`
}

// For entering scores
type SubmitGradeRequest struct {
	SectionID uuid.UUID          `json:"section_id" validate:"required"`
	Grades    []StudentGradeItem `json:"grades" validate:"required,dive"`
}

type ClassListResponse struct {
	SectionID    uuid.UUID          `json:"section_id"`
	CourseID     string             `json:"course_id"`
	SectionNum   int                `json:"section_num"`
	TotalStudent int                `json:"total_student"`
	Students     []StudentGradeItem `json:"students"`
}
