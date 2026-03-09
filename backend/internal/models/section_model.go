package models

type Section struct {
	Base
	CourseID   string `gorm:"not null"`
	SectionNum int    `gorm:"not null"`
	Capacity   int    `gorm:"not null"`
	Enrolled   int    `gorm:"default:0"`

	StudyTime string `gorm:"not null"`
	Deadline  string `gorm:"not null"`

	ProfessorID string    `gorm:"type:uuid;not null"`
	Professor   Professor `gorm:"foreignKey:ProfessorID"`

	Enrollments []Enrollment `gorm:"foreignKey:SectionID"`
}
