package models

import "errors"

var (
	ErrUsernameAndPasswordRequired = errors.New("username and password are required")
	ErrUsernameNotFound            = errors.New("username not found")
	ErrInvalidCredentials          = errors.New("invalid credentials")
	ErrInvalidRefreshToken         = errors.New("invalid refresh token")
	ErrInvalidAccessToken          = errors.New("invalid access token")
	ErrAccessTokenExpired          = errors.New("access token expired")
	ErrInvalidRequest              = errors.New("invalid request")
	ErrInternalServer              = errors.New("internal server error")
)
