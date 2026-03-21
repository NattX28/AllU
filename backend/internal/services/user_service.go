package services

import (
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/NattX28/AllU/internal/dto"
	"github.com/NattX28/AllU/internal/models"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

type UserService struct {
	db *gorm.DB
}

func NewUserService(db *gorm.DB) *UserService {
	return &UserService{db: db}
}

// normalizeYear converts any year input to Christian Era (4-digit)
// Accepts: 66, 67 (short BE), 2566, 2567 (full BE), 2023, 2024 (CE)
// Returns 0 if input is 0 or invalid
func normalizeYear(year int) int {
	if year <= 0 {
		return 0
	}

	// Short form — assume BE since system is Thai
	if year < 100 {
		return year + 2500 - 543
	}

	// If greater than current CE year, must be BE → convert
	if year > time.Now().Year() {
		return year - 543
	}

	// Otherwise already CE
	return year
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
		Name:     user.Name,
		Role:     user.Role,
	}

	// Mapping role-specific details
	switch user.Role {
	case models.RoleStudent:
		if user.Student != nil {

			res.Student = &dto.StudentDetail{
				StudentID: user.Student.StudentID,
				EntryYear: user.Student.EntryYear,
				Address:   user.Address,
				Birthday:  user.Birthday.Format("2006-01-02"),
				Gender:    user.Gender,
				Year:      user.Student.Year,
				Faculty:   user.Student.Faculty,
				Major:     user.Student.Major,
				GPAX:      user.Student.GPAX,
			}
		}
	case models.RoleProfessor:
		if user.Professor != nil {
			res.Professor = &dto.ProfessorDetail{
				ProfileID:   user.Professor.ID.String(),
				ProfessorID: user.Professor.ProfessorID,
				Faculty:     user.Professor.Faculty,
				Department:  user.Professor.Department,
				Address:     user.Address,
				Birthday:    user.Birthday.Format("2006-01-02"),
				Gender:      user.Gender,
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
		if req.Address != nil {
			user.Address = *req.Address
		}

		// Parse birthday
		if req.Birthday != nil {
			user.Birthday = *req.Birthday
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

	// Always JOIN first so all WHERE clauses can reference students/professors columns
	query := s.db.Model(&models.User{}).
		Joins("LEFT JOIN students ON students.user_id = users.id").
		Joins("LEFT JOIN professors ON professors.user_id = users.id")

	// Exact match — gender and role are enums, partial match makes no sense
	if filter.Gender != "" {
		query = query.Where("users.gender = ?", filter.Gender)
	}
	if filter.Role != "" {
		query = query.Where("users.role = ?", filter.Role)
	}

	// Partial, case-insensitive search (split with comma)
	if filter.Search != "" {
		terms := strings.Split(filter.Search, ",")
		orGroup := s.db.Where("1=0")
		for _, t := range terms {
			t = strings.TrimSpace(t)
			if t == "" {
				continue
			}
			term := "%" + t + "%"
			orGroup = orGroup.Or(
				s.db.Where(
					`(users.name ILIKE ?
                OR users.email ILIKE ?
                OR users.username ILIKE ?
                OR users.address ILIKE ?
                OR students.student_id ILIKE ?
                OR students.faculty ILIKE ?
                OR students.major ILIKE ?
                OR professors.professor_id ILIKE ?
                OR professors.faculty ILIKE ?
                OR professors.department ILIKE ?)`,
					term, term, term, term, term, term, term, term, term, term,
				),
			)
		}
		query = query.Where(orGroup)
	}

	// Inclusive date range filter on created_at
	if filter.StartDate != "" {
		query = query.Where("users.created_at >= ?", filter.StartDate+" 00:00:00")
	}
	if filter.EndDate != "" {
		query = query.Where("users.created_at <= ?", filter.EndDate+" 23:59:59")
	}

	// ILIKE so users can type partial faculty/major without needing exact spelling
	if filter.Faculty != "" {
		term := "%" + filter.Faculty + "%"
		query = query.Where("(students.faculty ILIKE ? OR professors.faculty ILIKE ?)", term, term)
	}
	if filter.Major != "" {
		term := "%" + filter.Major + "%"
		// professors use "department" as the equivalent of student "major"
		query = query.Where("(students.major ILIKE ? OR professors.department ILIKE ?)", term, term)
	}

	// Numeric range — exact comparison is correct here
	if filter.MinGPAX > 0 {
		query = query.Where("students.gpax >= ?", filter.MinGPAX)
	}
	if filter.MaxGPAX > 0 {
		query = query.Where("students.gpax <= ?", filter.MaxGPAX)
	}
	if filter.Year > 0 {
		query = query.Where("students.year = ?", filter.Year)
	}
	// Normalize before querying so 66 / 2566 / 2023 all match correctly
	if filter.EntryYear > 0 {
		query = query.Where("students.entry_year = ?", normalizeYear(filter.EntryYear))
	}

	// Extra JOINs only when filtering by course to avoid unnecessary table scans
	if filter.CourseID != "" {
		query = query.
			Joins("LEFT JOIN enrollments ON enrollments.student_id = students.student_id").
			Joins("LEFT JOIN sections ON sections.id = enrollments.section_id").
			Joins("LEFT JOIN courses ON courses.id = sections.course_id").
			Where("courses.course_id ILIKE ?", "%"+filter.CourseID+"%")
	}

	// GROUP BY to collapse duplicate rows caused by one-to-many JOINs
	query = query.Group("users.id")

	// Count total matching rows before applying pagination
	if err := query.Count(&total).Error; err != nil {
		return nil, err
	}

	// Dynamic sort column — default to created_at DESC
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

	// Pagination — default limit 10, page must be at least 1
	limit := filter.Limit
	if limit <= 0 {
		limit = 10
	}
	page := filter.Page
	if page <= 0 {
		page = 1
	}
	offset := (page - 1) * limit

	err := query.
		Preload("Student").
		Preload("Professor").
		Limit(limit).
		Offset(offset).
		Find(&users).Error
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

func (s *UserService) CreateUser(req dto.CreateUserRequest) error {
	// Validate role fields before creating user
	if err := s.validateRoleFields(req); err != nil {
		return err
	}

	// Hashed password that admin creates
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return fmt.Errorf("failed to hash password: %w", err)
	}

	// Transaction 2 steps(2 tables)
	return s.db.Transaction(func(tx *gorm.DB) error {
		isActive := false
		if req.IsActive != nil {
			isActive = *req.IsActive
		}

		mushChangePW := true
		if req.MustChangePassword != nil {
			mushChangePW = *req.MustChangePassword
		}

		newUser := models.User{
			Username:           req.Username,
			Email:              req.Email,
			Password:           string(hashedPassword),
			Name:               req.Name,
			Role:               req.Role,
			Gender:             req.Gender,
			IsActive:           isActive,
			MustChangePassword: mushChangePW,
		}

		if err := tx.Create(&newUser).Error; err != nil {
			return err
		}

		switch req.Role {
		case models.RoleStudent:
			studentProfile := models.Student{
				UserID:    newUser.ID,
				StudentID: req.StudentID,
				EntryYear: normalizeYear(req.EntryYear), // normalize before saving to DB
				Year:      req.Year,
				Faculty:   req.Faculty,
				Major:     req.Major,
				GPAX:      0.00,
			}
			if err := tx.Create(&studentProfile).Error; err != nil {
				return err
			}
		case models.RoleProfessor:
			professorProfile := models.Professor{
				UserID:      newUser.ID,
				ProfessorID: req.ProfessorID,
				Faculty:     req.Faculty,
				Department:  req.Department,
			}
			if err := tx.Create(&professorProfile).Error; err != nil {
				return err
			}
		}

		return nil
	})
}

// Helper function for validating role fields
func (s *UserService) validateRoleFields(req dto.CreateUserRequest) error {
	switch req.Role {
	case models.RoleStudent:
		if req.StudentID == "" || req.EntryYear == 0 || req.Faculty == "" || req.Major == "" {
			return errors.New("student_id, entry_year, faculty, and major are required for student role")
		}
	case models.RoleProfessor:
		if req.ProfessorID == "" || req.Faculty == "" || req.Department == "" {
			return errors.New("professor_id, faculty, and department are required for professor role")
		}
	}
	return nil
}

func (s *UserService) UpdateAdminUser(targetId uuid.UUID, req dto.UpdateUserAdminRequest) error {
	return s.db.Transaction(func(tx *gorm.DB) error {
		var user models.User
		if err := tx.Preload("Student").Preload("Professor").First(&user, "id = ?", targetId).Error; err != nil {
			return err
		}

		// Update Users(only sent)
		if req.Name != nil {
			user.Name = *req.Name
		}
		if req.Role != nil {
			user.Role = *req.Role
		}
		if req.IsActive != nil {
			user.IsActive = *req.IsActive
		}
		if req.MustChangePassword != nil {
			user.MustChangePassword = *req.MustChangePassword
		}
		if req.Gender != nil {
			user.Gender = *req.Gender
		}

		if err := tx.Save(&user).Error; err != nil {
			return err
		}

		// Update from Role
		if user.Role == models.RoleStudent {
			if req.StudentID != nil {
				user.Student.StudentID = *req.StudentID
			}
			if req.EntryYear != nil {
				user.Student.EntryYear = normalizeYear(*req.EntryYear) // normalize before saving to DB
			}
			if req.Year != nil {
				user.Student.Year = *req.Year
			}
			if req.Faculty != nil {
				user.Student.Faculty = *req.Faculty
			}
			if req.Major != nil {
				user.Student.Major = *req.Major
			}
			if req.GPAX != nil {
				user.Student.GPAX = *req.GPAX
			}

			if err := tx.Save(&user.Student).Error; err != nil {
				return err
			}
		} else if user.Role == models.RoleProfessor {
			if req.ProfessorID != nil {
				user.Professor.ProfessorID = *req.ProfessorID
			}
			if req.Faculty != nil {
				user.Professor.Faculty = *req.Faculty
			}
			if req.Department != nil {
				user.Professor.Department = *req.Department
			}

			if err := tx.Save(&user.Professor).Error; err != nil {
				return err
			}
		}

		return nil
	})
}

func (s *UserService) DeleteUser(targetId uuid.UUID) error {
	result := s.db.Delete(&models.User{}, "id = ?", targetId)

	if result.Error != nil {
		return result.Error
	}

	if result.RowsAffected == 0 {
		return errors.New("User that want to delete not found")
	}

	return nil
}
