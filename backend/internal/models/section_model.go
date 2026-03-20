package models

import (
	"github.com/google/uuid"
)

type Section struct {
	Base
	CourseID     string `gorm:"not null"`
	SectionNum   int    `gorm:"not null"`
	Semester     int    `gorm:"not null"` // 1, 2, 3
	AcademicYear int    `gorm:"not null"` // 2569
	Capacity     int    `gorm:"not null"`
	Enrolled     int    `gorm:"default:0"`

	ProfessorID uuid.UUID `gorm:"type:uuid;not null"`

	Course    Course            `gorm:"foreignKey:CourseID;constraint:-"`
	Professor Professor         `gorm:"foreignKey:ProfessorID;constraint:-"`
	Schedules []SectionSchedule `gorm:"foreignKey:SectionID;constraint:-"`
}
