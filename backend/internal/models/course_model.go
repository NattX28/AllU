package models

import "time"

type Course struct {
	Base
	CourseCode  string    `gorm:"not null"`
	Name        string    `gorm:"not null"`
	Credit      int       `gorm:"not null"`
	Section     int       `gorm:"not null"`
	Capacity    int       `gorm:"not null"`
	Enrolled    int       `gorm:"default:0"`
	StudyTime   string    `gorm:"not null"`
	Deadline    time.Time `gorm:"not null"`
	ProfessorID string    `gorm:"type:uuid;not null"`

	// Relations
	Professor   Professor
	Enrollments []Enrollment
	Templates   []TemplateCourse
}
