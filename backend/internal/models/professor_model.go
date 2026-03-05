package models

import "github.com/google/uuid"

type Professor struct {
	Base
	UserID      uuid.UUID `gorm:"uniqueIndex;not null"`
	ProfessorID string    `gorm:"uniqueIndex;not null"`
	// Relations
	User   User
	Course []Course
}
