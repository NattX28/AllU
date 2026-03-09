package dto

import "github.com/google/uuid"

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
