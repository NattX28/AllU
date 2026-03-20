package services

import (
	"crypto/rand"
	"encoding/hex"
	"time"

	"github.com/NattX28/AllU/internal/dto"
	"github.com/NattX28/AllU/internal/models"
	"github.com/golang-jwt/jwt/v5"
	"github.com/redis/go-redis/v9"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

type AuthService struct {
	db        *gorm.DB
	rdb       *redis.Client
	jwtSecret string
}

func NewAuthService(db *gorm.DB, rdb *redis.Client, jwtSecret string) *AuthService {
	return &AuthService{
		db:        db,
		rdb:       rdb,
		jwtSecret: jwtSecret,
	}
}

func (s *AuthService) Login(req dto.LoginRequest) (*dto.AuthResponse, error) {
	if req.Username == "" || req.Password == "" {
		return nil, models.ErrUsernameAndPasswordRequired
	}

	var user models.User
	if err := s.db.Preload("Student").Preload("Professor").Where("username = ?", req.Username).First(&user).Error; err != nil {
		return nil, models.ErrUsernameNotFound
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.Password)); err != nil {
		return nil, models.ErrInvalidCredentials
	}

	accessToken, err := s.generateAccessToken(&user)
	if err != nil {
		return nil, err
	}

	refreshToken, err := s.storeNewRefreshToken(&user)
	if err != nil {
		return nil, err
	}

	return &dto.AuthResponse{
		UserID:       user.ID,
		Role:         user.Role,
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
	}, nil
}

func (s *AuthService) Logout(refreshToken string) error {
	result := s.db.Model(&models.RefreshToken{}).
		Where("token = ? AND revoked = ?", refreshToken, false).
		Update("revoked", true)
	return result.Error
}

func (s *AuthService) Refresh(oldRefreshToken string) (string, string, error) {
	var token models.RefreshToken
	if err := s.db.Preload("User").
		Preload("User.Student").
		Preload("User.Professor").
		Where("token = ? AND revoked = ?", oldRefreshToken, false).
		First(&token).Error; err != nil {
		return "", "", models.ErrInvalidRefreshToken
	}

	if time.Now().After(token.ExpiresAt) {
		return "", "", models.ErrInvalidRefreshToken
	}

	// Revoke old token ก่อน
	token.Revoked = true
	if err := s.db.Save(&token).Error; err != nil {
		return "", "", err
	}

	newAccessToken, err := s.generateAccessToken(&token.User)
	if err != nil {
		return "", "", err
	}

	// storeNewRefreshToken จัดการ create ใน db เอง (ไม่ซ้ำซ้อน)
	newRefreshToken, err := s.storeNewRefreshToken(&token.User)
	if err != nil {
		return "", "", err
	}

	return newAccessToken, newRefreshToken, nil
}

func (s *AuthService) generateAccessToken(user *models.User) (string, error) {
	var profileID string
	if user.Role == models.RoleStudent && user.Student != nil {
		profileID = user.Student.ID.String()
	} else if user.Role == models.RoleProfessor && user.Professor != nil {
		profileID = user.Professor.ID.String()
	}

	claims := dto.Claims{
		UserID:    user.ID.String(),
		Role:      string(user.Role),
		ProfileID: profileID,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(30 * time.Minute)),
		},
	}

	t := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return t.SignedString([]byte(s.jwtSecret))
}

// storeNewRefreshToken สร้าง token string และ insert 1 row เท่านั้น
func (s *AuthService) storeNewRefreshToken(user *models.User) (string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	tokenStr := hex.EncodeToString(b)

	row := models.RefreshToken{
		Token:     tokenStr,
		UserID:    user.ID,
		ExpiresAt: time.Now().Add(7 * 24 * time.Hour),
		Revoked:   false,
	}
	if err := s.db.Create(&row).Error; err != nil {
		return "", err
	}

	return tokenStr, nil
}
