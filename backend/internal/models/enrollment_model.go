package models

import "github.com/google/uuid"

type EnrollmentStatus string

const (
	StatusEnrolled  EnrollmentStatus = "enrolled"
	StatusWithdrawn EnrollmentStatus = "withdrawn"
	StatusGraded    EnrollmentStatus = "graded"
)

type Enrollment struct {
	Base
	StudentID string           `gorm:"not null;uniqueIndex:idx_std_sec"`
	SectionID uuid.UUID        `gorm:"not null;uniqueIndex:idx_std_sec"`
	Status    EnrollmentStatus `gorm:"type:varchar(20);default:'enrolled'"`

	// Sub Score
	AttendanceScore *float64 `json:"attendanceScore,omitempty"`
	AssignmentScore *float64 `json:"assignmentScore,omitempty"`
	MidtermScore    *float64 `json:"midtermScore,omitempty"`
	FinalScore      *float64 `json:"finalScore,omitempty"`

	TotalScore float64 `gorm:"default:0"`

	// Grade
	LetterGrade  string  `gorm:"type:varchar(2)"`
	NumericGrade float64 `gorm:"type:decimal(3,2)"`

	// Summary at day of enrollment
	Semester     int `gorm:"not null"`
	AcademicYear int `gorm:"not null"`

	// Relations
	Student Student `gorm:"foreignKey:StudentID;references:StudentID;constraint:-"`
	Section Section `gorm:"foreignKey:SectionID;references:ID;constraint:-"`
}
