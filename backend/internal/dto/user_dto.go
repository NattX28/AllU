package dto

import (
	"github.com/NattX28/AllU/internal/models"
	"github.com/google/uuid"
)

type GetMeResponse struct {
	UserID   uuid.UUID   `json:"id"`
	Username string      `json:"username"`
	Role     models.Role `json:"role"`

	Student   *StudentDetail   `json:"student,omitempty"`
	Professor *ProfessorDetail `json:"professor,omitempty"`
}

type StudentDetail struct {
	StudentID string  `json:"student_id"`
	EntryYear int     `json:"entry_year"`
	Year      int     `json:"year"`
	Faculty   string  `json:"faculty"`
	Major     string  `json:"major"`
	GPAX      float64 `json:"gpax"`
}

type ProfessorDetail struct {
	ProfessorID string `json:"professor_id"`
	Faculty     string `json:"faculty"`
	Department  string `json:"department"`
}

type UpdateMeRequest struct {
	Name     *string `json:"name"`
	Birthday *string `json:"birthday"`
	Gender   *string `json:"gender"`

	// specific fields
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
