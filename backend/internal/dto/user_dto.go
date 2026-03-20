package dto

import (
	"time"

	"github.com/NattX28/AllU/internal/models"
	"github.com/google/uuid"
)

type GetMeResponse struct {
	UserID   uuid.UUID   `json:"id"`
	Username string      `json:"username"`
	Name     string      `json:"name"`
	Role     models.Role `json:"role"`

	Student   *StudentDetail   `json:"student,omitempty"`
	Professor *ProfessorDetail `json:"professor,omitempty"`
}

type StudentDetail struct {
	StudentID string  `json:"student_id"`
	EntryYear int     `json:"entry_year"`
	Year      int     `json:"year"`
	Address   string  `json:"address"`
	Birthday  string  `json:"birthday"`
	Gender    string  `json:"gender"`
	Faculty   string  `json:"faculty"`
	Major     string  `json:"major"`
	GPAX      float64 `json:"gpax"`
}

type ProfessorDetail struct {
	ProfessorID string `json:"professor_id"`
	Faculty     string `json:"faculty"`
	Department  string `json:"department"`
	Address     string `json:"address"`
	Birthday    string `json:"birthday"`
	Gender      string `json:"gender"`
}

// EnrolledCourseResponse for grade page (viewing score/grade)
type EnrolledCourseResponse struct {
	EnrollmentID string `json:"enrollment_id"`
	CourseID     string `json:"course_id"`
	CourseName   string `json:"course_name"`
	Credits      int    `json:"credits"`
	SectionNum   int    `json:"section_num"`
	Status       string `json:"status"`
	Semester     int    `json:"semester"`
	AcademicYear int    `json:"academic_year"`

	AttendanceScore *float64 `json:"attendance_score,omitempty"`
	AssignmentScore *float64 `json:"assignment_score,omitempty"`
	MidtermScore    *float64 `json:"midterm_score,omitempty"`
	FinalScore      *float64 `json:"final_score,omitempty"`
	TotalScore      float64  `json:"total_score,omitempty"`
	Grade           string   `json:"grade"`
}

type UpdateMeRequest struct {
	Name     *string    `json:"name"`
	Birthday *time.Time `json:"birthday"`
	Address  *string    `json:"address"`
	Gender   *string    `json:"gender"`

	Year    *int    `json:"year,omitempty"`
	Faculty *string `json:"faculty,omitempty"`
	Major   *string `json:"major,omitempty"`
}

type UserFilterQuery struct {
	Page      int         `query:"page"`
	Limit     int         `query:"limit"`
	Role      models.Role `query:"role"`
	Search    string      `query:"search"`
	Gender    string      `query:"gender"`
	EntryYear int         `query:"entry_year"`
	StartDate string      `query:"start_date"`
	MinGPAX   float64     `query:"min_gpax"`
	MaxGPAX   float64     `query:"max_gpax"`
	EndDate   string      `query:"end_date"`
	Year      int         `query:"year"`
	Faculty   string      `query:"faculty"`
	Major     string      `query:"major"`
	CourseID  string      `query:"course_id"`
	SortBy    string      `query:"sort_by"`
	Order     string      `query:"order"`
}

type UserListResponse struct {
	Total int64           `json:"total"`
	Data  []GetMeResponse `json:"data"`
}

type CreateUserRequest struct {
	Username string      `json:"username" validate:"required,min=8"`
	Email    string      `json:"email" validate:"required,email"`
	Password string      `json:"password" validate:"required,min=8"`
	Name     string      `json:"name" validate:"required"`
	Role     models.Role `json:"role" validate:"required"`
	Address  string      `json:"address" validate:"required"`
	Birthday time.Time   `json:"birthday" validate:"required"`
	Gender   string      `json:"gender" validate:"required"`

	IsActive           *bool `json:"is_active"`
	MustChangePassword *bool `json:"must_change_password"`

	// Student
	StudentID string `json:"student_id"`
	EntryYear int    `json:"entry_year"`
	Year      int    `json:"year"`
	Faculty   string `json:"faculty"`
	Major     string `json:"major"`

	// Professor
	ProfessorID string `json:"professor_id"`
	Department  string `json:"department"`
}

type UpdateUserAdminRequest struct {
	Name               *string      `json:"name"`
	Role               *models.Role `json:"role"`
	IsActive           *bool        `json:"is_active"`
	MustChangePassword *bool        `json:"must_change_password"`
	Address            *string      `json:"address"`
	Birthday           *time.Time   `json:"birthday"`
	Gender             *string      `json:"gender"`

	// Student
	StudentID *string  `json:"student_id"`
	EntryYear *int     `json:"entry_year"`
	Year      *int     `json:"year"`
	Faculty   *string  `json:"faculty"`
	Major     *string  `json:"major"`
	GPAX      *float64 `json:"gpax"`

	// Professor
	ProfessorID *string `json:"professor_id"`
	Department  *string `json:"department"`
}
