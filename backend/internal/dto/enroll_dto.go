package dto

// For UI polling
type CheckSeatsRequest struct {
	SectionIDs []string `json:"section_ids" validate:"required,min=1"`
}

type CheckSeatsResponse struct {
	SectionID string `json:"section_id"`
	Available int    `json:"available"`
	IsFull    bool   `json:"is_full"`
}

// Bulk confirm
type ConfirmEnrollRequest struct {
	SectionIDs []string `json:"section_ids" validate:"required,min=1"`
}

type ConfirmEnrollResponse struct {
	Message      string   `json:"message"`
	EnrolledIDs  []string `json:"enrolled_ids"` // uuid of sections
	TotalCredits int      `json:"total_credits"`
}

type UpdateScheduleRequest struct {
	NewSectionIDs []string `json:"new_section_ids" validate:"required"`
}

type WithdrawRequest struct {
	SectionID string `json:"section_id" validate:"required"`
}
