package handler

import (
	"strings"

	"github.com/NattX28/AllU/internal/dto"
	"github.com/NattX28/AllU/internal/services"
	"github.com/gofiber/fiber/v3"
	"github.com/google/uuid"
)

type EnrollHandler struct {
	enrollService *services.EnrollService
}

func NewEnrollHandler(s *services.EnrollService) *EnrollHandler {
	return &EnrollHandler{enrollService: s}
}

func (h *EnrollHandler) CheckSeats(c fiber.Ctx) error {
	idsParam := c.Query("ids")
	if idsParam == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "ids query parameter is required",
		})
	}

	sectionIDs := strings.Split(idsParam, ",")

	res, err := h.enrollService.CheckDraftSeats(sectionIDs)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "failed to check seats",
		})
	}

	return c.JSON(res)
}

func (h *EnrollHandler) Confirm(c fiber.Ctx) error {
	studentID, ok := c.Locals("profileID").(uuid.UUID)
	if !ok {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "failed to get student ID",
		})
	}

	var req dto.ConfirmEnrollRequest
	if err := c.Bind().Body(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "failed to parse request body",
		})
	}
	res, err := h.enrollService.ConfirmEnrollment(studentID, req.SectionIDs)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "failed to confirm enroll",
		})
	}
	return c.Status(fiber.StatusCreated).JSON(res)
}

func (h *EnrollHandler) UpdateSchedule(c fiber.Ctx) error {
	studentID, ok := c.Locals("profileID").(uuid.UUID)
	if !ok {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "failed to get student ID",
		})
	}

	var req dto.ConfirmEnrollRequest
	if err := c.Bind().Body(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "failed to parse request body",
		})
	}
	err := h.enrollService.UpdateEnrollment(studentID, req.SectionIDs)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"message": "failed to update enroll",
			"error":   err.Error(),
		})
	}
	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"message": "update schedule success",
	})
}
