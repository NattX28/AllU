package models

import "github.com/google/uuid"

type Professor struct {
	Base
	UserID      uuid.UUID `gorm:"type:uuid;uniqueIndex;not null;constraint:OnDelete:CASCADE"`
	ProfessorID string    `gorm:"uniqueIndex;not null"`
	Faculty     string    `gorm:"not null"`
	Department  string    `gorm:"not null"`
	// Relations
	User     User      `gorm:"foreignKey:UserID"`
	Sections []Section `gorm:"foreignKey:ProfessorID"`
}
