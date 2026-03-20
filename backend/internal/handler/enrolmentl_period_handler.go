package handler

import (
	"github.com/NattX28/AllU/internal/dto"
	"github.com/NattX28/AllU/internal/services"
	"github.com/gofiber/fiber/v3"
	"github.com/google/uuid"
)

type EnrollmentPeriodHandler struct {
	periodService *services.EnrollmentPeriodService
}

func NewEnrollmentPeriodHandler(s *services.EnrollmentPeriodService) *EnrollmentPeriodHandler {
	return &EnrollmentPeriodHandler{periodService: s}
}

// GetActive — student/frontend use for checking if there is an active enrollment period
// return 200 + null data if no active period (not error)
func (h *EnrollmentPeriodHandler) GetActive(c fiber.Ctx) error {
	res, err := h.periodService.GetActive()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"data": res, // null if no active period
	})
}

// Create — admin create new enrollment period
func (h *EnrollmentPeriodHandler) Create(c fiber.Ctx) error {
	var req dto.CreateEnrollmentPeriodRequest
	if err := c.Bind().Body(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "failed to parse request body",
		})
	}

	res, err := h.periodService.Create(req)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.Status(fiber.StatusCreated).JSON(res)
}

// Update — admin edit or toggle IsActive
func (h *EnrollmentPeriodHandler) Update(c fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "invalid period id",
		})
	}

	var req dto.UpdateEnrollmentPeriodRequest
	if err := c.Bind().Body(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "failed to parse request body",
		})
	}

	res, err := h.periodService.Update(id, req)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.Status(fiber.StatusOK).JSON(res)
}
