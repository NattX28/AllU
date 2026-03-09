package dto

import (
	"github.com/NattX28/AllU/internal/models"
	"github.com/google/uuid"
)

type CreateCourseRequest struct {
	ID              string   `json:"id" validate:"required"` // ex. CPE101
	NameTh          string   `json:"name_th" validate:"required"`
	NameEn          string   `json:"name_en" validate:"required"`
	Credits         int      `json:"credits" validate:"required,min=1"`
	Category        string   `json:"category" validate:"required"`
	MaxEntryYear    int      `json:"max_entry_year"`
	LectureHours    int      `json:"lecture_hours"`
	LabHours        int      `json:"lab_hours"`
	SelfStudyHours  int      `json:"self_study_hours"`
	PrerequisiteIDs []string `json:"prerequisite_ids"` // ["SOME101"]
}

type CreateSectionRequest struct {
	CourseID    string    `json:"course_id" validate:"required"`
	SectionNum  int       `json:"section_num" validate:"required,min=1"`
	Capacity    int       `json:"capacity" validate:"required,min=1"`
	StudyTime   string    `json:"study_time" validate:"required"`
	Deadline    string    `json:"deadline" validate:"required"`
	ProfessorID uuid.UUID `json:"professor_id" validate:"required"`
}

type UpdateCourseRequest struct {
	NameTh          *string                `json:"name_th"`
	NameEn          *string                `json:"name_en"`
	Credits         *int                   `json:"credits"`
	Category        *models.CourseCategory `json:"category"`
	MaxEntryYear    *int                   `json:"max_entry_year"`
	LectureHours    *int                   `json:"lecture_hours"`
	LabHours        *int                   `json:"lab_hours"`
	SelfStudyHours  *int                   `json:"self_study_hours"`
	PrerequisiteIDs []string               `json:"prerequisite_ids"` // new send for replace
}

type UpdateSectionRequest struct {
	SectionNum  *int       `json:"section_num"`
	Capacity    *int       `json:"capacity"`
	StudyTime   *string    `json:"study_time"`
	Deadline    *string    `json:"deadline"`
	ProfessorID *uuid.UUID `json:"professor_id"`
}

type CourseResponse struct {
	ID       string            `json:"id"`
	NameTh   string            `json:"name_th"`
	NameEn   string            `json:"name_en"`
	Credits  int               `json:"credits"`
	Sections []SectionResponse `json:"sections"`
}

type SectionResponse struct {
	ID            uuid.UUID `json:"id"`
	SectionNum    int       `json:"section_num"`
	Capacity      int       `json:"capacity"`
	Available     int       `json:"available"` // From Redis
	StudyTime     string    `json:"study_time"`
	ProfessorName string    `json:"professor_name"`
}

type CourseDetailResponse struct {
	ID          string `json:"id"`
	NameTh      string `json:"name_th"`
	NameEn      string `json:"name_en"`
	Credits     int    `json:"credits"`
	Description string `json:"description"`
	Category    string `json:"category"`
	// Prerequisites
	Prerequisites []PrereqResponse  `json:"prerequisites"`
	Sections      []SectionResponse `json:"sections"`
}

type PrereqResponse struct {
	ID     string `json:"id"`
	NameEn string `json:"name_en"`
	NameTh string `json:"name_th"`
}
