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
	if err := h.enrollService.UpdateEnrollment(studentID, req.SectionIDs); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"message": "failed to update enroll",
			"error":   err.Error(),
		})
	}
	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"message": "update schedule success",
	})
}

func (h *EnrollHandler) Withdraw(c fiber.Ctx) error {
	studentID, ok := c.Locals("profileID").(uuid.UUID)
	if !ok {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "failed to get student ID",
		})
	}

	var req dto.WithdrawRequest
	if err := c.Bind().Body(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "failed to parse request body",
		})
	}

	secID, _ := uuid.Parse(req.SectionID)
	err := h.enrollService.WithdrawCourse(studentID, secID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"message": "failed to withdraw enroll",
			"error":   err.Error(),
		})
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"message": "withdraw success",
	})
}

func (h *EnrollHandler) GetMyEnrollments(c fiber.Ctx) error {
	studentID, _ := c.Locals("profileID").(uuid.UUID)
	mode := c.Query("mode", "all")

	res, err := h.enrollService.GetMyEnrollments(studentID, mode)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"message": "failed to get my enrollments",
			"error":   err.Error(),
		})
	}

	return c.Status(fiber.StatusOK).JSON(res)
}
