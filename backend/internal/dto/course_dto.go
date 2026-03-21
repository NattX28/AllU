package dto

import (
	"github.com/NattX28/AllU/internal/models"
	"github.com/google/uuid"
)

// ─── Schedule ───

type CreateScheduleRequest struct {
	Day       models.DayOfWeek    `json:"day" validate:"required,oneof=MON TUE WED THU FRI SAT SUN"`
	StartTime string              `json:"start_time" validate:"required"` // "09:00"
	EndTime   string              `json:"end_time" validate:"required"`   // "12:00"
	Room      string              `json:"room" validate:"required"`
	Type      models.ScheduleType `json:"type" validate:"required,oneof=LECTURE LAB"`
}

type ScheduleResponse struct {
	ID        uuid.UUID           `json:"id"`
	Day       models.DayOfWeek    `json:"day"`
	StartTime string              `json:"start_time"`
	EndTime   string              `json:"end_time"`
	Room      string              `json:"room"`
	Type      models.ScheduleType `json:"type"`
}

// ─── Course ───

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
	PrerequisiteIDs []string `json:"prerequisite_ids"`
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
	PrerequisiteIDs []string               `json:"prerequisite_ids"`
}

// ─── Section ────

type CreateSectionRequest struct {
	CourseID     string                  `json:"course_id" validate:"required"`
	SectionNum   int                     `json:"section_num" validate:"required,min=1"`
	Semester     int                     `json:"semester" validate:"required,min=1,max=3"`
	AcademicYear int                     `json:"academic_year" validate:"required"`
	Capacity     int                     `json:"capacity" validate:"required,min=1"`
	ProfessorID  uuid.UUID               `json:"professor_id" validate:"required"`
	Schedules    []CreateScheduleRequest `json:"schedules" validate:"required,min=1,dive"`
}

type UpdateSectionRequest struct {
	SectionNum  *int                    `json:"section_num"`
	Capacity    *int                    `json:"capacity"`
	ProfessorID *uuid.UUID              `json:"professor_id"`
	Schedules   []CreateScheduleRequest `json:"schedules"` // ถ้าส่งมา = replace ทั้งหมด
}

type SectionResponse struct {
	ID                 uuid.UUID          `json:"id"`
	SectionNum         int                `json:"section_num"`
	Semester           int                `json:"semester"`
	AcademicYear       int                `json:"academic_year"`
	Capacity           int                `json:"capacity"`
	Available          int                `json:"available"` // From Redis
	ProfessorName      string             `json:"professor_name"`
	ProfessorProfileID string             `json:"professor_profile_id"` // professors.id UUID
	Schedules          []ScheduleResponse `json:"schedules"`
}

// ─── Course Response ───

type CourseResponse struct {
	ID       string            `json:"id"`
	NameTh   string            `json:"name_th"`
	NameEn   string            `json:"name_en"`
	Credits  int               `json:"credits"`
	Category string            `json:"category"`
	Sections []SectionResponse `json:"sections"`
}

type CourseDetailResponse struct {
	ID            string            `json:"id"`
	NameTh        string            `json:"name_th"`
	NameEn        string            `json:"name_en"`
	Credits       int               `json:"credits"`
	Description   string            `json:"description"`
	Category      string            `json:"category"`
	Prerequisites []PrereqResponse  `json:"prerequisites"`
	Sections      []SectionResponse `json:"sections"`
}

type PrereqResponse struct {
	ID     string `json:"id"`
	NameEn string `json:"name_en"`
	NameTh string `json:"name_th"`
}
