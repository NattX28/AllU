package models

type Professor struct {
	Base
	UserID      string `gorm:"type:uuid;uniqueIndex;not null"`
	ProfessorID string `gorm:"type:uuid;uniqueIndex;not null"`
	// Relations
	User User
}
