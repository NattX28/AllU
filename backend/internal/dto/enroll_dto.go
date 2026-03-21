package dto

import "time"

// ─── Seat Check ────

type CheckSeatsResponse struct {
	SectionID string `json:"section_id"`
	Available int    `json:"available"`
	IsFull    bool   `json:"is_full"`
}

// ─── Confirm / Update ───

type ConfirmEnrollRequest struct {
	SectionIDs []string `json:"section_ids" validate:"required,min=1"`
}

type ConfirmEnrollResponse struct {
	Message      string   `json:"message"`
	EnrolledIDs  []string `json:"enrolled_ids"`
	TotalCredits int      `json:"total_credits"`
}

type UpdateEnrollRequest struct {
	SectionIDs []string `json:"section_ids" validate:"required"`
}

// ─── Withdraw ───

type WithdrawRequest struct {
	EnrollmentID string `json:"enrollment_id" validate:"required"`
}

// ─── History (result registration page) ───

type EnrollmentHistoryItem struct {
	EnrollmentID    string   `json:"enrollment_id"`
	CourseID        string   `json:"course_id"`
	CourseNameTh    string   `json:"course_name_th"`
	CourseNameEn    string   `json:"course_name_en"`
	Credits         int      `json:"credits"`
	SectionNum      int      `json:"section_num"`
	Status          string   `json:"status"`
	Semester        int      `json:"semester"`
	AcademicYear    int      `json:"academic_year"`
	AssignScore     float64  `json:"assign_score"`
	AttendanceScore *float64 `json:"attendance_score,omitempty"`
	AssignmentScore *float64 `json:"assignment_score,omitempty"`
	MidtermScore    *float64 `json:"midterm_score,omitempty"`
	FinalScore      *float64 `json:"final_score,omitempty"`
	TotalScore      float64  `json:"total_score"`
	Grade           string   `json:"grade"`
}

type EnrollmentHistoryResponse struct {
	Semester     int                     `json:"semester"`
	AcademicYear int                     `json:"academic_year"`
	TotalCredits int                     `json:"total_credits"`
	Courses      []EnrollmentHistoryItem `json:"courses"`
}

// ─── Schedule (Schedule table page) ───

type ScheduleSlot struct {
	Day       string `json:"day"`        // "MON","TUE",...
	StartTime string `json:"start_time"` // "09:00"
	EndTime   string `json:"end_time"`   // "12:00"
	Room      string `json:"room"`
	Type      string `json:"type"` // "LECTURE","LAB"
}

type TimetableCourse struct {
	EnrollmentID string         `json:"enrollment_id"`
	CourseID     string         `json:"course_id"`
	CourseNameTh string         `json:"course_name_th"`
	CourseNameEn string         `json:"course_name_en"`
	SectionNum   int            `json:"section_num"`
	Credits      int            `json:"credits"`
	Schedules    []ScheduleSlot `json:"schedules"`
}

type TimetableResponse struct {
	Semester     int               `json:"semester"`
	AcademicYear int               `json:"academic_year"`
	Courses      []TimetableCourse `json:"courses"`
}

// ─── Enrollment Period ───

type CreateEnrollmentPeriodRequest struct {
	Semester     int       `json:"semester" validate:"required,min=1,max=3"`
	AcademicYear int       `json:"academic_year" validate:"required"`
	StartDate    time.Time `json:"start_date" validate:"required"`
	EndDate      time.Time `json:"end_date" validate:"required"`
	IsActive     bool      `json:"is_active"`
}

type UpdateEnrollmentPeriodRequest struct {
	StartDate *time.Time `json:"start_date"`
	EndDate   *time.Time `json:"end_date"`
	IsActive  *bool      `json:"is_active"`
}

type EnrollmentPeriodResponse struct {
	ID           string    `json:"id"`
	Semester     int       `json:"semester"`
	AcademicYear int       `json:"academic_year"`
	StartDate    time.Time `json:"start_date"`
	EndDate      time.Time `json:"end_date"`
	IsActive     bool      `json:"is_active"`
}
