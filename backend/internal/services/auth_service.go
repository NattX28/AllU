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
	if err := s.db.Where("username = ?", req.Username).First(&user).Error; err != nil {
		return nil, models.ErrUsernameNotFound
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.Password)); err != nil {
		return nil, models.ErrInvalidCredentials
	}

	// Generate access token
	accessToken, err := s.generateAccessToken(&user)
	if err != nil {
		return nil, err
	}

	// Generate refresh token
	refreshToken, err := s.generateRefreshToken(&user)
	if err != nil {
		return nil, err
	}

	return &dto.AuthResponse{
		UserID:       user.ID.String(),
		Role:         string(user.Role),
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
	}, nil
}

func (s *AuthService) generateAccessToken(user *models.User) (string, error) {
	claims := dto.Claims{
		UserID: user.ID.String(),
		Role:   string(user.Role),
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(30 * time.Minute)),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(s.jwtSecret))
}

func (s *AuthService) generateRefreshToken(user *models.User) (string, error) {
	// Generate random token string
	tokenBytes := make([]byte, 32)
	if _, err := rand.Read(tokenBytes); err != nil {
		return "", err
	}

	tokenStr := hex.EncodeToString(tokenBytes)

	// Store in db
	refreshToken := models.RefreshToken{
		Token:     tokenStr,
		UserID:    user.ID,
		ExpiresAt: time.Now().Add(7 * 24 * time.Hour),
	}

	if err := s.db.Create(&refreshToken).Error; err != nil {
		return "", err
	}

	return tokenStr, nil
}
