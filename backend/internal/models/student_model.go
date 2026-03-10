package models

import "github.com/google/uuid"

type Student struct {
	Base
	UserID    uuid.UUID `gorm:"type:uuid;uniqueIndex;not null;constraint:OnDelete:CASCADE"`
	StudentID string    `gorm:"uniqueIndex;not null"`
	EntryYear int       `gorm:"not null"`
	Year      int       `gorm:"not null"`
	Faculty   string    `gorm:"not null"`
	Major     string    `gorm:"not null"`

	GPAX float64 `gorm:"type:decimal(3,2);default:0.00"`

	// Relations
	User        User         `gorm:"foreignKey:UserID"`
	Enrollments []Enrollment `gorm:"foreignKey:StudentID"`
}
