package models

import "time"

type Role string

const (
	RoleStudent = "student"
	RoleFaculty = "faculty"
	RoleAdmin   = "admin"
)

type User struct {
	Base
	Name     string `gorm:"not null"`
	Email    string `gorm:"uniqueIndex;not null"`
	Password string `gorm:"not null"`
	Role     Role   `gorm:"type:varchar(10);not null"`
	Birthday time.Time
	Gender   string `gorm:"type:varchar(10)"`

	// Relations
	Student   *Student
	Professor *Professor
}
