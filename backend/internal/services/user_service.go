package services

import (
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
				Year:      user.Student.Year,
				Faculty:   user.Student.Faculty,
				Major:     user.Student.Major,
			}
		}
	case models.RoleProfessor:
		if user.Professor != nil {
			res.Professor = &dto.ProfessorDetail{
				ProfessorID: user.Professor.ProfessorID,
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
