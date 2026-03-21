package dto

import "github.com/google/uuid"

type ProfessorSectionResponse struct {
	SectionID    uuid.UUID `json:"section_id"`
	CourseID     string    `json:"course_id"`
	CourseName   string    `json:"course_name"`
	SectionNum   int       `json:"section_num"`
	TotalStudent int       `json:"total_student"`
	Semester     int       `json:"semester"`
	AcademicYear int       `json:"academic_year"`
}

// StudentGradeItem ใช้ทั้งรับและส่งข้อมูล
// - AttendanceScore: 0–10, AssignmentScore: 0–20, MidtermScore: 0–30, FinalScore: 0–40
// - TotalScore: backend คำนวณเอง ไม่ validate max เพราะ frontend ส่ง 0 มาตอน save
// - Grade, Status: backend set เอง
type StudentGradeItem struct {
	EnrollmentID    uuid.UUID `json:"enrollment_id"`
	StudentID       string    `json:"student_id"`
	StudentName     string    `json:"student_name"`
	AttendanceScore *float64  `json:"attendance_score"`
	AssignmentScore *float64  `json:"assignment_score"`
	MidtermScore    *float64  `json:"midterm_score"`
	FinalScore      *float64  `json:"final_score"`
	TotalScore      float64   `json:"total_score"`
	Grade           string    `json:"grade"`
	Status          string    `json:"status"`
}

// SaveScoresRequest — บันทึกคะแนนย่อย ยังไม่ตัดเกรด
type SaveScoresRequest struct {
	SectionID uuid.UUID          `json:"section_id" validate:"required"`
	Grades    []StudentGradeItem `json:"grades"     validate:"required,dive"`
}

// CommitGradeRequest — ตัดเกรด
// CommitAll=true  → ทั้งห้อง
// CommitAll=false → เฉพาะ EnrollmentIDs
type CommitGradeRequest struct {
	SectionID     uuid.UUID   `json:"section_id"    validate:"required"`
	CommitAll     bool        `json:"commit_all"`
	EnrollmentIDs []uuid.UUID `json:"enrollment_ids"`
}

type CommitGradeResponse struct {
	Committed int    `json:"committed"`
	Skipped   int    `json:"skipped"`
	Message   string `json:"message"`
}

type ClassListResponse struct {
	SectionID    uuid.UUID          `json:"section_id"`
	CourseID     string             `json:"course_id"`
	SectionNum   int                `json:"section_num"`
	TotalStudent int                `json:"total_student"`
	Students     []StudentGradeItem `json:"students"`
}

type GetMyGradesRequest struct {
	Semester int `query:"semester,default=0"`
	Year     int `query:"year,default=0"`
}

type GradeDetails struct {
	CourseID   string   `json:"course_id"`
	CourseName string   `json:"course_name"`
	Credits    int      `json:"credits"`
	Attendance *float64 `json:"attendance"`
	Assignment *float64 `json:"assignment"`
	Midterm    *float64 `json:"midterm"`
	Final      *float64 `json:"final"`
	Total      float64  `json:"total"`
	Grade      string   `json:"grade"`
}

type MyGradesResponse struct {
	Semester     int            `json:"semester"`
	AcademicYear int            `json:"academic_year"`
	TermGPA      float64        `json:"term_gpa"`
	TotalCredits int            `json:"total_credits"`
	Courses      []GradeDetails `json:"courses"`
}

// SubmitGradeRequest — deprecated
type SubmitGradeRequest struct {
	SectionID uuid.UUID          `json:"section_id" validate:"required"`
	Grades    []StudentGradeItem `json:"grades"     validate:"required,dive"`
}
