package handler

import (
	"github.com/NattX28/AllU/internal/dto"
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

func (h *UserHandler) UpdateMe(c fiber.Ctx) error {
	userID := c.Locals("userID").(uuid.UUID)

	var req dto.UpdateMeRequest
	if err := c.Bind().Body(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": models.ErrInvalidRequest})
	}

	if err := h.userService.UpdateMe(userID, req); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": models.ErrInternalServer})
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{"message": "profile updated successfully"})
}

func (h *UserHandler) GetAllUsers(c fiber.Ctx) error {
	var filter dto.UserFilterQuery

	if err := c.Bind().Query(&filter); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": models.ErrInvalidRequest})
	}

	res, err := h.userService.GetAllUsers(filter)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": models.ErrInternalServer})
	}

	return c.Status(fiber.StatusOK).JSON(res)
}

func (h *UserHandler) CreateUser(c fiber.Ctx) error {
	var req dto.CreateUserRequest
	if err := c.Bind().Body(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"message": "sent data is invalid",
			"error":   err.Error(),
		})
	}

	// Save in db 2 table(User + Profile)
	if err := h.userService.CreateUser(req); err != nil {
		return c.Status(fiber.StatusConflict).JSON(
			fiber.Map{
				"message": "failed to create user",
				"error":   err.Error(),
			})
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{"message": "user created successfully (wait to activate)"})
}
