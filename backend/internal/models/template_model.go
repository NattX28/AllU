package models

type Template struct {
	Base
	StudentID string `gorm:"type:uuid;not null"`
	Name      string `gorm:"not null"`

	// Relations
	Student Student
	Course  []TemplateCourse
}

type TemplateCourse struct {
	Base
	TemplateID string `gorm:"type:uuid;not null;uniqueIndex:idx_template_course_code"`
	CourseCode string `gorm:"not null;uniqueIndex:idx_template_course_code"`

	CourseID string `gorm:"type:uuid;not null"`

	// Relations
	Template Template
	Course   Course
}
