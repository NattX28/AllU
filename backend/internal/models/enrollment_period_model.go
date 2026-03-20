package models

import "time"

// EnrollmentPeriod defines the window during which students can enroll/update/withdraw.
// Only one period should have IsActive = true at a time.
type EnrollmentPeriod struct {
	Base
	Semester     int       `gorm:"not null"`
	AcademicYear int       `gorm:"not null"`
	StartDate    time.Time `gorm:"not null"`
	EndDate      time.Time `gorm:"not null"` // enrollment deadline
	IsActive     bool      `gorm:"default:false;index"`
}
