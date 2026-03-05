package models

type NotificationType string

const (
	NotifEnrolled NotificationType = "enrolled"
	NotifApproved NotificationType = "approved"
	NotifRejected NotificationType = "rejected"
	NotifDeadline NotificationType = "deadline"
)

type Notification struct {
	Base
	UserID  string           `gorm:"type:uuid;not null"`
	Type    NotificationType `gorm:"type:varchar(20);not null"`
	Message string           `gorm:"not null"`
	IsRead  bool             `gorm:"default:false"`

	// Relations
	User User
}
