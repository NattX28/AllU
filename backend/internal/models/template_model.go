package models

import "github.com/google/uuid"

type Template struct {
	Base
	StudentID uuid.UUID `gorm:"type:uuid;not null"`
	Name      string    `gorm:"not null"`

	// Relations
	Section []Section `gorm:"many2many:template_sections;"`
	Student Student   `gorm:"foreignKey:StudentID"`
}

type TemplateSection struct {
	Base
	TemplateID uuid.UUID `gorm:"type:uuid;not null;uniqueIndex:idx_template_section"`
	// CourseID for preventing duplicate course in the same template
	CourseID string `gorm:"type:uuid;not null;uniqueIndex:idx_template_section"`
	// Use to take to check in redis
	SectionID uuid.UUID `gorm:"type:uuid;not null"`

	Template Template `gorm:"foreignKey:TemplateID"`
	Section  Section  `gorm:"foreignKey:SectionID"`
}
