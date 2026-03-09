package handler

import (
	"fmt"

	"github.com/NattX28/AllU/internal/dto"
	"github.com/NattX28/AllU/internal/services"
	"github.com/gofiber/fiber/v3"
	"github.com/google/uuid"
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

func (h *CourseHandler) UpdateCourse(c fiber.Ctx) error {
	id := c.Params("id")
	var req dto.UpdateCourseRequest
	if err := c.Bind().Body(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"message": "invalid request",
			"error":   err.Error(),
		})
	}

	if err := h.courseService.UpdateCourse(id, req); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"message": "failed to update course",
			"error":   err.Error(),
		})
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"message": "course" + *req.NameEn + "updated successfully",
	})
}

func (h *CourseHandler) UpdateSection(c fiber.Ctx) error {
	id := c.Params("id")
	sectionID, err := uuid.Parse(id)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"message": "invalid section id",
			"error":   err.Error(),
		})
	}

	var req dto.UpdateSectionRequest
	if err := c.Bind().Body(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"message": "invalid request",
			"error":   err.Error(),
		})
	}

	if err := h.courseService.UpdateSection(sectionID, req); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"message": "failed to update section",
			"error":   err.Error(),
		})
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"message": "section updated successfully",
	})
}
