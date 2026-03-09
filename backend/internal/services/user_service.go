package services

import (
	"fmt"
	"strings"
	"time"

	"github.com/NattX28/AllU/internal/dto"
	"github.com/NattX28/AllU/internal/models"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type UserService struct {
	db *gorm.DB
}

func NewUserService(db *gorm.DB) *UserService {
	return &UserService{db: db}
}

func (s *UserService) GetMe(userId uuid.UUID) (*dto.GetMeResponse, error) {
	var user models.User
	if err := s.db.Preload("Student").Preload("Professor").Where("id = ?", userId).First(&user).Error; err != nil {
		return nil, err
	}

	return s.mapToGetMeResponse(&user), nil
}

// Helper function for GetMe
func (s *UserService) mapToGetMeResponse(user *models.User) *dto.GetMeResponse {
	res := &dto.GetMeResponse{
		UserID:   user.ID,
		Username: user.Username,
		Role:     user.Role,
	}

	// Mapping role-specific details
	switch user.Role {
	case models.RoleStudent:
		if user.Student != nil {
			res.Student = &dto.StudentDetail{
				StudentID: user.Student.StudentID,
				EntryYear: user.Student.EntryYear,
				Year:      user.Student.Year,
				Faculty:   user.Student.Faculty,
				Major:     user.Student.Major,
				GPAX:      user.Student.GPAX,
			}
		}
	case models.RoleProfessor:
		if user.Professor != nil {
			res.Professor = &dto.ProfessorDetail{
				ProfessorID: user.Professor.ProfessorID,
				Faculty:     user.Professor.Faculty,
				Department:  user.Professor.Department,
			}
		}
	}

	return res
}

func (s *UserService) UpdateMe(userId uuid.UUID, req dto.UpdateMeRequest) error {
	return s.db.Transaction(func(tx *gorm.DB) error {
		var user models.User
		if err := tx.Preload("Student").Preload("Professor").First(&user, "id = ?", userId).Error; err != nil {
			return err
		}

		// Update User (Only selected fields)
		if req.Name != nil {
			user.Name = *req.Name
		}
		if req.Gender != nil {
			user.Gender = *req.Gender
		}

		// Parse birthday
		if req.Birthday != nil {
			birthday, err := time.Parse("2006-01-02", *req.Birthday)
			if err != nil {
				return err
			}
			user.Birthday = birthday
		}

		if err := tx.Save(&user).Error; err != nil {
			return err
		}

		// Update child table(Student / Professor)
		if user.Role == models.RoleStudent && user.Student != nil {
			if req.Year != nil {
				user.Student.Year = *req.Year
			}
			if req.Faculty != nil {
				user.Student.Faculty = *req.Faculty
			}
			if req.Major != nil {
				user.Student.Major = *req.Major
			}
			if err := tx.Save(user.Student).Error; err != nil {
				return err
			}
		} else if user.Role == models.RoleProfessor && user.Professor != nil {
			// Update professor details
			if err := tx.Save(user.Professor).Error; err != nil {
				return err
			}
		}

		return nil
	})
}

func (s *UserService) GetAllUsers(filter dto.UserFilterQuery) (*dto.UserListResponse, error) {
	var users []models.User
	var total int64

	// Base query
	query := s.db.Model(&models.User{}).Distinct("users.*")

	// Filter basic data (Gender / Role)
	if filter.Gender != "" {
		query = query.Where("users.gender = ?", filter.Gender)
	}
	if filter.Role != "" {
		query = query.Where("users.role = ?", filter.Role)
	}
	if filter.Search != "" {
		searchTerm := "%" + filter.Search + "%"
		query = query.Where("(users.name Like ? OR users.email Like ?)", searchTerm, searchTerm)
	}

	// Filter with date range
	if filter.StartDate != "" {
		query = query.Where("users.created_at >= ?", filter.StartDate+" 00:00:00")
	}
	if filter.EndDate != "" {
		query = query.Where("users.created_at <= ?", filter.EndDate+" 23:59:59")
	}

	query = query.Joins("LEFT JOIN students ON students.user_id = users.id").Joins("LEFT JOIN professors ON professors.user_id = users.id")

	// Cross table filter
	// (Faculty / Major / Year / EntryYear)
	if filter.Faculty != "" || filter.Major != "" || filter.Year > 0 || filter.EntryYear > 0 || filter.CourseID != "" || filter.MinGPAX > 0 || filter.MaxGPAX > 0 {
		if filter.Faculty != "" {
			query = query.Where("(students.faculty = ? OR professors.faculty = ?)", filter.Faculty, filter.Faculty)
		}
		if filter.Major != "" {
			query = query.Where("students.major = ? OR professors.department = ?", filter.Major, filter.Major)
		}
		if filter.MinGPAX > 0 {
			query = query.Where("students.gpax >= ?", filter.MinGPAX)
		}
		if filter.MaxGPAX > 0 {
			query = query.Where("students.gpax <= ? AND users.role = ?", filter.MaxGPAX, models.RoleStudent)
		}
		if filter.Year > 0 {
			query = query.Where("students.year = ?", filter.Year)
		}
		if filter.EntryYear > 0 {
			query = query.Where("students.entry_year = ?", filter.EntryYear)
		}
		// Filter with course ID
		if filter.CourseID != "" {
			query = query.Joins("LEFT JOIN enrollments ON enrollments.student_id = students.id").
				Joins("LEFT JOIN courses ON courses.professor_id = professors.id").
				Where("(enrollments.course_id = ? OR courses.course_id = ?)", filter.CourseID, filter.CourseID)
		}
	}

	// Count total users before pagination
	if err := query.Count(&total).Error; err != nil {
		return nil, err
	}

	// Dynamic Sort
	sortCol := "users.created_at"
	switch filter.SortBy {
	case "name":
		sortCol = "users.name"
	case "gpax":
		sortCol = "students.gpax"
	case "email":
		sortCol = "users.email"
	case "role":
		sortCol = "users.role"
	}

	sortOrd := "DESC"
	if strings.ToUpper(filter.Order) == "ASC" {
		sortOrd = "ASC"
	}
	query = query.Order(fmt.Sprintf("%s %s", sortCol, sortOrd))

	// Pagination
	limit := filter.Limit
	if limit <= 0 {
		limit = 10
	}
	offset := (filter.Page - 1) * limit

	err := query.Preload("Student").Preload("Professor").Limit(limit).Offset(offset).Find(&users).Error

	if err != nil {
		return nil, err
	}

	var userDTOs []dto.GetMeResponse
	for _, user := range users {
		userDTOs = append(userDTOs, *s.mapToGetMeResponse(&user))
	}

	return &dto.UserListResponse{
		Total: total,
		Data:  userDTOs,
	}, nil
}
