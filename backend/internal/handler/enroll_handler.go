package handler

import (
	"strings"

	"github.com/NattX28/AllU/internal/services"
	"github.com/gofiber/fiber/v3"
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
