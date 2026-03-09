package handler

import (
	"fmt"

	"github.com/NattX28/AllU/internal/dto"
	"github.com/NattX28/AllU/internal/services"
	"github.com/gofiber/fiber/v3"
)

type CourseHandler struct {
	courseService *services.CourseService
}

func (h *CourseHandler) CreateCourse(c fiber.Ctx) error {
	var req dto.CreateCourseRequest
	if err := c.Bind().Body(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"message": "invalid request",
			"error":   err.Error(),
		})
	}

	if err := h.courseService.CreateCourse(req); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"message": "failed to create course",
			"error":   err.Error(),
		})
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"message": "course[" + req.ID + "] created successfully",
	})
}

func (h *CourseHandler) CreateSection(c fiber.Ctx) error {
	var req dto.CreateSectionRequest
	if err := c.Bind().Body(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"message": "invalid request",
			"error":   err.Error(),
		})
	}

	if err := h.courseService.CreateSection(req); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"message": "failed to create section",
			"error":   err.Error(),
		})
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"message": "section" + fmt.Sprint(req.SectionNum) + "created successfully",
	})
}
