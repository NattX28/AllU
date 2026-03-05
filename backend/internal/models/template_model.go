package models

import "github.com/google/uuid"

type Template struct {
	Base
	StudentID uuid.UUID `gorm:"type:uuid;not null"`
	Name      string    `gorm:"not null"`

	// Relations
	Student Student
	Course  []TemplateCourse
}

type TemplateCourse struct {
	Base
	TemplateID uuid.UUID `gorm:"type:uuid;not null;uniqueIndex:idx_template_course_code"`
	CourseCode string    `gorm:"not null;uniqueIndex:idx_template_course_code"`

	CourseID uuid.UUID `gorm:"type:uuid;not null"`

	// Relations
	Template Template
	Course   Course
}
