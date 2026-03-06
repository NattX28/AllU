package dto

import "github.com/golang-jwt/jwt/v5"

type Claims struct {
	UserID string `json:"user_id"`
	Role   string `json:"role"`
	jwt.RegisteredClaims
}

type LoginRequest struct {
	Username string `json:"username" form:"username"`
	Password string `json:"password" form:"password"`
}

type LoginResponse struct {
	UserID string `json:"user_id"`
	Role   string `json:"role"`
	Token  string `json:"token"`
}

type AuthResponse struct {
	UserID       string
	Role         string
	AccessToken  string
	RefreshToken string
}
