package models

type CourseCategory string

const (
	CoreCourse     CourseCategory = "CORE_COURSE"
	ElectiveCourse CourseCategory = "ELECTIVE_COURSE"
	GenEdCourse    CourseCategory = "GENED_COURSE"
)

// Raw course
type Course struct {
	ID             string         `gorm:"primaryKey"` // ex. CPE101
	NameTh         string         `gorm:"not null"`
	NameEn         string         `gorm:"not null"`
	Credits        int            `gorm:"not null"`
	Category       CourseCategory `gorm:"type:varchar(20);default:'CORE_COURSE';not null"`
	MaxEntryYear   int            `gorm:"default:99"`
	LectureHours   int            `gorm:"default:0"`
	LabHours       int            `gorm:"default:0"`
	SelfStudyHours int            `gorm:"default:0"`

	Prerequisites     []Course `gorm:"many2many:course_prerequisites;foreignkey:ID;joinForeignKey:CourseID;References:ID;joinReferences:PrerequisiteID"`
	IsPrerequisiteFor []Course `gorm:"many2many:course_prerequisites;foreignKey:ID;joinForeignKey:PrerequisiteID;References:ID;joinReferences:CourseID"`

	Sections []Section `gorm:"foreignKey:CourseID"`
}
