package models

import "errors"

var (
	// 400: Error messages for Bad Request errors
	ErrInvalidRequest              = errors.New("invalid request")
	ErrUsernameAndPasswordRequired = errors.New("username and password are required")

	// 401: Error messages for Authentication and Authorization errors
	ErrInvalidCredentials  = errors.New("invalid credentials")
	ErrUnauthorized        = errors.New("unauthorized")
	ErrInvalidAccessToken  = errors.New("invalid access token")
	ErrInvalidRefreshToken = errors.New("invalid refresh token")
	ErrAccessTokenExpired  = errors.New("access token expired")

	// 403: Error messages for Forbidden errors
	ErrForbidden    = errors.New("forbidden: you do not have permission to access this resource")
	ErrUserDisabled = errors.New("user account is disabled")

	// 404: Error messages for Not Found errors
	ErrUsernameNotFound = errors.New("username not found")
	ErrUserNotFound     = errors.New("user not found")
	ErrResourceNotFound = errors.New("resource not found")

	// 409: Error messages for Conflict errors
	ErrUserAlreadyExists = errors.New("user already exists")

	// 500: Error messages for Internal Server errors
	ErrInternalServer = errors.New("internal server error")
	ErrDatabase       = errors.New("database operation failed")
	ErrUnknownError   = errors.New("unknown error")
)
