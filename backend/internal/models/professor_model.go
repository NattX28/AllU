package models

import "github.com/google/uuid"

type Professor struct {
	Base
	UserID      uuid.UUID `gorm:"type:uuid;uniqueIndex;not null;constraint:OnDelete:CASCADE"`
	ProfessorID string    `gorm:"uniqueIndex;not null"`
	// Relations
	User   User
	Course []Course
}
