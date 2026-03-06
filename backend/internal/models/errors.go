package models

import "errors"

var (
	ErrEmailAndPasswordRequired = errors.New("email and password are required")
	ErrInvalidCredentials       = errors.New("invalid credentials")
	ErrInvalidRefreshToken      = errors.New("invalid refresh token")
	ErrInvalidAccessToken       = errors.New("invalid access token")
	ErrAccessTokenExpired       = errors.New("access token expired")
)
