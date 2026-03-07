package handler

import (
	"github.com/NattX28/AllU/internal/models"
	"github.com/NattX28/AllU/internal/services"
	"github.com/gofiber/fiber/v3"
	"github.com/google/uuid"
)

type UserHandler struct {
	userService *services.UserService
}

func NewUserHandler(user *services.UserService) *UserHandler {
	return &UserHandler{userService: user}
}

func (h *UserHandler) GetMe(c fiber.Ctx) error {
	userID, ok := c.Locals("userID").(uuid.UUID)
	if !ok {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "invalid user ID format in context",
		})
	}

	res, err := h.userService.GetMe(userID)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": models.ErrUserNotFound,
		})
	}

	return c.Status(fiber.StatusOK).JSON(res)
}
