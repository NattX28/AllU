package models

import (
	"time"

	"github.com/google/uuid"
)

type RefreshToken struct {
	Base
	Token     string    `gorm:"unique;not null"`
	UserID    uuid.UUID `gorm:"type:uuid;not null;index;constraint:OnDelete:CASCADE"`
	ExpiresAt time.Time
	Revoked   bool `gorm:"default:false"`

	User User
}
