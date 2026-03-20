package models

import "github.com/google/uuid"

type ScheduleType string
type DayOfWeek string

const (
	ScheduleLecture ScheduleType = "LECTURE"
	ScheduleLab     ScheduleType = "LAB"

	DayMon DayOfWeek = "MON"
	DayTue DayOfWeek = "TUE"
	DayWed DayOfWeek = "WED"
	DayThu DayOfWeek = "THU"
	DayFri DayOfWeek = "FRI"
	DaySat DayOfWeek = "SAT"
	DaySun DayOfWeek = "SUN"
)

// SectionSchedule represents one time slot for a section.
// A section can have multiple schedules (e.g. lecture Mon + lab Wed).
type SectionSchedule struct {
	Base
	SectionID uuid.UUID    `gorm:"type:uuid;not null;index"`
	Day       DayOfWeek    `gorm:"type:varchar(3);not null"` // "MON","TUE",...
	StartTime string       `gorm:"type:varchar(5);not null"` // "09:00"
	EndTime   string       `gorm:"type:varchar(5);not null"` // "12:00"
	Room      string       `gorm:"type:varchar(50);not null"`
	Type      ScheduleType `gorm:"type:varchar(10);not null"` // "LECTURE","LAB"

	Section Section `gorm:"foreignKey:SectionID;constraint:-"`
}
