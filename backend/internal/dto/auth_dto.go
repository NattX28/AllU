package dto

import (
	"github.com/NattX28/AllU/internal/models"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

type Claims struct {
	UserID    string `json:"user_id"`
	Role      string `json:"role"`
	ProfileID string `json:"profile_id"`
	jwt.RegisteredClaims
}

type LoginRequest struct {
	Username string `json:"username" form:"username"`
	Password string `json:"password" form:"password"`
}

type LoginResponse struct {
	UserID uuid.UUID   `json:"user_id"`
	Role   models.Role `json:"role"`
	Token  string      `json:"token"`
}

type AuthResponse struct {
	UserID       uuid.UUID
	Role         models.Role
	AccessToken  string
	RefreshToken string
}
