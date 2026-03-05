package models

import "github.com/google/uuid"

type EnrollmentStatus string

const (
	StatusEnrolled EnrollmentStatus = "enrolled"
	StatusPending  EnrollmentStatus = "pending"
	StatusDropped  EnrollmentStatus = "dropped"
	StatusRejected EnrollmentStatus = "rejected"
)

type Enrollment struct {
	Base
	StudentID  uuid.UUID        `gorm:"type:uuid;not null;uniqueIndex:idx_std_course_code"`
	CourseCode string           `gorm:"not null;uniqueIndex:idx_std_course_code"` // Lock course code
	CourseID   uuid.UUID        `gorm:"type:uuid;not null"`                       // point to ID of section
	Status     EnrollmentStatus `gorm:"type:varchar(20);default:'enrolled'"`

	// Grade
	LetterGrade  string `gorm:"type:varchar(2)"`
	NumericGrade float64

	// For change section
	RequestedSection int

	// Relations
	Student Student
	Course  Course
}
