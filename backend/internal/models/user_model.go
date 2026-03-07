package models

import "time"

type Role string

const (
	RoleStudent   Role = "student"
	RoleProfessor Role = "professor"
	RoleAdmin     Role = "admin"
)

type User struct {
	Base
	Name     string `gorm:"not null"`
	Username string `gorm:"uniqueIndex;not null"`
	Email    string `gorm:"uniqueIndex;not null"`
	Password string `gorm:"not null"`
	Role     Role   `gorm:"type:varchar(10);not null"`
	Birthday time.Time
	Gender   string `gorm:"type:varchar(10)"`

	// Relations
	Student   *Student
	Professor *Professor
}
