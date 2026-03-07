package services

import (
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
