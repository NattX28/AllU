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
	studentID, ok := c.Locals("studentID").(uuid.UUID)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "unauthorized",
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
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.Status(fiber.StatusCreated).JSON(res)
}

func (h *EnrollHandler) Update(c fiber.Ctx) error {
	studentID, ok := c.Locals("studentID").(uuid.UUID)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "unauthorized",
		})
	}

	var req dto.UpdateEnrollRequest
	if err := c.Bind().Body(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "failed to parse request body",
		})
	}

	if err := h.enrollService.UpdateEnrollment(studentID, req.SectionIDs); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"message": "enrollment updated successfully",
	})
}

func (h *EnrollHandler) Withdraw(c fiber.Ctx) error {
	studentID, ok := c.Locals("studentID").(uuid.UUID)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "unauthorized",
		})
	}

	enrollmentIDStr := c.Query("enrollment_id")
	if enrollmentIDStr == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "enrollment_id query parameter is required",
		})
	}

	enrollmentID, err := uuid.Parse(enrollmentIDStr)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "invalid enrollment_id",
		})
	}

	if err := h.enrollService.WithdrawCourse(studentID, enrollmentID); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"message": "withdrawn successfully",
	})
}

func (h *EnrollHandler) GetHistory(c fiber.Ctx) error {
	studentID, ok := c.Locals("studentID").(uuid.UUID)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "unauthorized",
		})
	}

	sem := parseIntQuery(c.Query("semester"))
	year := parseIntQuery(c.Query("academic_year"))

	res, err := h.enrollService.GetHistory(studentID, sem, year)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.Status(fiber.StatusOK).JSON(res)
}

func (h *EnrollHandler) GetSchedule(c fiber.Ctx) error {
	studentID, ok := c.Locals("studentID").(uuid.UUID)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "unauthorized",
		})
	}

	sem := parseIntQuery(c.Query("semester"))
	year := parseIntQuery(c.Query("academic_year"))

	if sem == 0 || year == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "semester and academic_year are required",
		})
	}

	res, err := h.enrollService.GetSchedule(studentID, sem, year)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.Status(fiber.StatusOK).JSON(res)
}

// ─── Helper ───

func parseIntQuery(s string) int {
	n := 0
	for _, ch := range s {
		if ch < '0' || ch > '9' {
			return 0
		}
		n = n*10 + int(ch-'0')
	}
	return n
}
