package models

type Student struct {
	Base
	UserID    string `gorm:"type:uuid;uniqueIndex;not null;constraint:OnDelete:CASCADE"`
	StudentID string `gorm:"uniqueIndex;not null"`
	Year      int    `gorm:"not null"`
	Faculty   string `gorm:"not null"`
	Major     string `gorm:"not null"`

	// Relations
	User        User
	Enrollments []Enrollment
	Templates   []Template
}
