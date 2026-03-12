package services

import (
	"fmt"
	"mime/multipart"
	"strconv"
	"strings"
	"time"

	"github.com/NattX28/AllU/internal/dto"
	"github.com/NattX28/AllU/internal/models"
	"github.com/xuri/excelize/v2"
)

// User sheet column indices
const (
	colUsername    = 0
	colEmail       = 1
	colPassword    = 2
	colName        = 3
	colRole        = 4
	colGender      = 5
	colAddress     = 6
	colBirthday    = 7
	colIsActive    = 8
	colMustChange  = 9
	colStudentID   = 10
	colEntryYear   = 11
	colYear        = 12
	colFaculty     = 13
	colMajor       = 14
	colProfessorID = 15
	colDepartment  = 16
)

// Course sheet column indices
const (
	colCourseID        = 0
	colNameTh          = 1
	colNameEn          = 2
	colCredits         = 3
	colCategory        = 4
	colMaxEntryYear    = 5
	colLectureHours    = 6
	colLabHours        = 7
	colSelfStudyHours  = 8
	colPrerequisiteIDs = 9
)

type ImportService struct {
	userService   *UserService
	courseService *CourseService
}

func NewImportService(userService *UserService, courseService *CourseService) *ImportService {
	return &ImportService{
		userService:   userService,
		courseService: courseService,
	}
}

type RowError struct {
	Row     int    `json:"row"`
	Message string `json:"message"`
}

type ImportResult struct {
	TotalRows  int        `json:"total_rows"`
	Inserted   int        `json:"inserted"`
	FailedRows []RowError `json:"failed_rows,omitempty"`
}

/*
 * Columns: username | email | password | name | role | gender | address | birthday(YYYY-MM-DD) | is_active | must_change_password  | student_id | entry_year | year | faculty | major | professor_id | department

 */

func (s *ImportService) ImportUsers(file multipart.File, sheet string) (*ImportResult, error) {
	rows, err := readSheet(file, sheet)
	if err != nil {
		return nil, err
	}

	result := &ImportResult{TotalRows: len(rows)}
	for i, row := range rows {
		excelRow := i + 2
		col := colFn(row)

		req, err := parseUserRow(col)
		if err != nil {
			result.FailedRows = append(result.FailedRows, RowError{Row: excelRow, Message: err.Error()})
			continue
		}
		if err := s.userService.CreateUser(req); err != nil {
			result.FailedRows = append(result.FailedRows, RowError{Row: excelRow, Message: err.Error()})
			continue
		}
		result.Inserted++
	}
	return result, nil
}

func (s *ImportService) ImportCourses(file multipart.File, sheet string) (*ImportResult, error) {
	rows, err := readSheet(file, sheet)
	if err != nil {
		return nil, err
	}

	result := &ImportResult{TotalRows: len(rows)}
	for i, row := range rows {
		excelRow := i + 2
		col := colFn(row)

		req, err := parseCourseRow(col)
		if err != nil {
			result.FailedRows = append(result.FailedRows, RowError{Row: excelRow, Message: err.Error()})
			continue
		}
		if err := s.courseService.CreateCourse(req); err != nil {
			result.FailedRows = append(result.FailedRows, RowError{Row: excelRow, Message: err.Error()})
			continue
		}
		result.Inserted++
	}
	return result, nil
}
func parseUserRow(col func(int) string) (dto.CreateUserRequest, error) {
	if col(colUsername) == "" || col(colEmail) == "" || col(colPassword) == "" || col(colName) == "" || col(colRole) == "" {
		return dto.CreateUserRequest{}, fmt.Errorf("missing required fields (username/email/password/name/role)")
	}

	birthday, err := time.Parse("2006-01-02", col(colBirthday))
	if err != nil {
		return dto.CreateUserRequest{}, fmt.Errorf("invalid birthday '%s', expected YYYY-MM-DD", col(colBirthday))
	}

	isActive := col(colIsActive) == "true" || col(colIsActive) == "1"
	mustChange := col(colMustChange) != "false" && col(colMustChange) != "0"

	return dto.CreateUserRequest{
		Username:           col(colUsername),
		Email:              col(colEmail),
		Password:           col(colPassword),
		Name:               col(colName),
		Role:               models.Role(col(colRole)),
		Gender:             col(colGender),
		Address:            col(colAddress),
		Birthday:           birthday,
		IsActive:           &isActive,
		MustChangePassword: &mustChange,
		StudentID:          col(colStudentID),
		EntryYear:          atoiOrZero(col(colEntryYear)),
		Year:               atoiOrZero(col(colYear)),
		Faculty:            col(colFaculty),
		Major:              col(colMajor),
		ProfessorID:        col(colProfessorID),
		Department:         col(colDepartment),
	}, nil
}

func parseCourseRow(col func(int) string) (dto.CreateCourseRequest, error) {
	if col(colCourseID) == "" || col(colNameTh) == "" || col(colNameEn) == "" || col(colCredits) == "" || col(colCategory) == "" {
		return dto.CreateCourseRequest{}, fmt.Errorf("missing required fields (id/name_th/name_en/credits/category)")
	}

	credits, err := strconv.Atoi(col(colCredits))
	if err != nil || credits < 1 {
		return dto.CreateCourseRequest{}, fmt.Errorf("invalid credits value: '%s'", col(colCredits))
	}

	return dto.CreateCourseRequest{
		ID:              col(colCourseID),
		NameTh:          col(colNameTh),
		NameEn:          col(colNameEn),
		Credits:         credits,
		Category:        col(colCategory),
		MaxEntryYear:    atoiOrZero(col(colMaxEntryYear)),
		LectureHours:    atoiOrZero(col(colLectureHours)),
		LabHours:        atoiOrZero(col(colLabHours)),
		SelfStudyHours:  atoiOrZero(col(colSelfStudyHours)),
		PrerequisiteIDs: splitComma(col(colPrerequisiteIDs)),
	}, nil
}

// Helpers
func readSheet(file multipart.File, sheet string) ([][]string, error) {
	f, err := excelize.OpenReader(file)
	if err != nil {
		return nil, fmt.Errorf("cannot open excel file: %w", err)
	}
	defer f.Close()

	rows, err := f.GetRows(sheet)
	if err != nil {
		return nil, fmt.Errorf("cannot get rows from excel file: %w", err)
	}

	if len(rows) < 2 {
		return nil, nil
	}
	return rows[1:], nil // skip header
}

func colFn(row []string) func(int) string {
	return func(idx int) string {
		if idx < len(row) {
			return strings.TrimSpace(row[idx])
		}
		return ""
	}
}

func splitComma(s string) []string {
	if s == "" {
		return nil
	}
	var result []string
	for _, p := range strings.Split(s, ",") {
		if trimmed := strings.TrimSpace(p); trimmed != "" {
			result = append(result, trimmed)
		}
	}
	return result
}

func atoiOrZero(s string) int {
	n, _ := strconv.Atoi(s)
	return n
}
