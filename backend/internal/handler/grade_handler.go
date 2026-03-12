package handler

import (
	"github.com/NattX28/AllU/internal/services"
	"github.com/gofiber/fiber/v3"
	"github.com/google/uuid"
)

type GradeHandler struct {
	gradeService *services.GradeService
}

func NewGradeHandler(s *services.GradeService) *GradeHandler {
	return &GradeHandler{gradeService: s}
}

func (h *GradeHandler) GetProfessorSections(c fiber.Ctx) error {
	profID, ok := c.Locals("profileID").(uuid.UUID)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"message": "Unauthorized",
		})
	}

	res, err := h.gradeService.GetProfessorSections(profID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"message": "can't get professor sections",
			"error":   err.Error(),
		})
	}

	return c.Status(fiber.StatusOK).JSON(res)
}
