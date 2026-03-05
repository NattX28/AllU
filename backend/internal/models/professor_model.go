package models

type Professor struct {
	Base
	UserID      string `gorm:"uniqueIndex;not null"`
	ProfessorID string `gorm:"type:uuid;uniqueIndex;not null"`
	// Relations
	User   User
	Course []Course
}
