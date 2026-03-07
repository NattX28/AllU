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
	StudentID string `json:"student_id"`
	Year      int    `json:"year"`
	Faculty   string `json:"faculty"`
	Major     string `json:"major"`
}

type ProfessorDetail struct {
	ProfessorID string `json:"professor_id"`
}
