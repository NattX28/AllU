package models

import (
	"time"

	"github.com/google/uuid"
)

type Section struct {
	Base
	CourseID   string `gorm:"not null"`
	SectionNum int    `gorm:"not null"`
	Capacity   int    `gorm:"not null"`
	Enrolled   int    `gorm:"default:0"`

	StudyTime string    `gorm:"not null"`
	Deadline  time.Time `gorm:"not null"`

	ProfessorID uuid.UUID `gorm:"type:uuid;not null"`
	Professor   Professor `gorm:"foreignKey:ProfessorID"`

	Enrollments []Enrollment `gorm:"foreignKey:SectionID"`
}
