package handler

import (
	"github.com/NattX28/AllU/internal/dto"
	"github.com/NattX28/AllU/internal/models"
	"github.com/NattX28/AllU/internal/services"
	"github.com/gofiber/fiber/v3"
)

type AuthHandler struct {
	s *services.AuthService
}

func NewAuthHandler(s *services.AuthService) *AuthHandler {
	return &AuthHandler{s: s}
}

func (h *AuthHandler) Login(c fiber.Ctx) error {
	var req dto.LoginRequest
	if err := c.Bind().Body(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{
			"error": models.ErrInvalidRequest,
		})
	}

	res, err := h.s.Login(req)
	if err != nil {
		switch err {
		case models.ErrUsernameAndPasswordRequired:
			return c.Status(400).JSON(fiber.Map{
				"error": err.Error(),
			})
		case models.ErrUsernameNotFound, models.ErrInvalidCredentials:
			return c.Status(401).JSON(fiber.Map{
				"error": err.Error(),
			})
		default:
			return c.Status(500).JSON(fiber.Map{
				"error": models.ErrInternalServer,
			})
		}
	}

	// Set refresh token to session cookie
	c.Cookie(&fiber.Cookie{
		Name:     "refresh_token",
		Value:    res.RefreshToken,
		HTTPOnly: true,
		SameSite: "Lax",
	})

	return c.Status(200).JSON(dto.LoginResponse{
		UserID: res.UserID,
		Role:   res.Role,
		Token:  res.AccessToken,
	})
}

func (h *AuthHandler) Logout(c fiber.Ctx) error {
	refreshToken := c.Cookies("refresh_token")
	if refreshToken == "" {
		return c.Status(400).JSON(fiber.Map{"error": "missing refresh token"})
	}

	if err := h.s.Logout(refreshToken); err != nil {
		switch err {
		case models.ErrInvalidRefreshToken:
			return c.Status(401).JSON(fiber.Map{"error": err.Error()})
		default:
			return c.Status(500).JSON(fiber.Map{
				"error": models.ErrInternalServer,
			})
		}
	}
	// Delete cookie
	c.ClearCookie("refresh_token")

	return c.JSON(fiber.Map{"message": "logged out successfully"})
}
