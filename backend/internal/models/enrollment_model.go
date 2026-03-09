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
	StudentID uuid.UUID        `gorm:"type:uuid;not null;uniqueIndex:idx_std_sec"`
	SectionID uuid.UUID        `gorm:"type:uuid;not null;uniqueIndex:idx_std_sec"`
	Status    EnrollmentStatus `gorm:"type:varchar(20);default:'enrolled'"`

	// Grade
	LetterGrade  string  `gorm:"type:varchar(2)"`
	NumericGrade float64 `gorm:"type:decimal(3,2)"`

	Semester     int `gorm:"not null"`
	AcademicYear int `gorm:"not null"`

	// Relations
	Student Student `gorm:"foreignKey:StudentID"`
	Section Section `gorm:"foreignKey:SectionID"`
}
