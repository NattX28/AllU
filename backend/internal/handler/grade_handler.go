package handler

import (
	"github.com/NattX28/AllU/internal/dto"
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

// GET /professor/sections
func (h *GradeHandler) GetProfessorSections(c fiber.Ctx) error {
	profID, ok := c.Locals("professorID").(uuid.UUID)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"message": "Unauthorized"})
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

// GET /professor/sections/:id/students
func (h *GradeHandler) GetClassList(c fiber.Ctx) error {
	profID, ok := c.Locals("professorID").(uuid.UUID)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"message": "Unauthorized"})
	}

	secID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"message": "invalid sectionID"})
	}

	res, err := h.gradeService.GetClassList(profID, secID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"message": "can't get class list",
			"error":   err.Error(),
		})
	}
	return c.Status(fiber.StatusOK).JSON(res)
}

// POST /professor/grades — บันทึกคะแนนย่อย (ไม่ตัดเกรด)
func (h *GradeHandler) SaveScores(c fiber.Ctx) error {
	profID, ok := c.Locals("professorID").(uuid.UUID)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"message": "Unauthorized"})
	}

	var req dto.SaveScoresRequest
	if err := c.Bind().Body(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"message": "invalid request body",
			"error":   err.Error(),
		})
	}

	if err := h.gradeService.SaveScores(profID, req); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"message": "can't save scores",
			"error":   err.Error(),
		})
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{"message": "scores saved successfully"})
}

// POST /professor/grades/commit — ตัดเกรด (รายคนหรือทั้งห้อง)
func (h *GradeHandler) CommitGrades(c fiber.Ctx) error {
	profID, ok := c.Locals("professorID").(uuid.UUID)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"message": "Unauthorized"})
	}

	var req dto.CommitGradeRequest
	if err := c.Bind().Body(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"message": "invalid request body",
			"error":   err.Error(),
		})
	}

	res, err := h.gradeService.CommitGrades(profID, req)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"message": "can't commit grades",
			"error":   err.Error(),
		})
	}

	return c.Status(fiber.StatusOK).JSON(res)
}

// GET /grades/my — นักศึกษาดูเกรดตัวเอง
func (h *GradeHandler) GetMyGrades(c fiber.Ctx) error {
	studentID, ok := c.Locals("studentID").(uuid.UUID)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"message": "Unauthorized"})
	}

	req := new(dto.GetMyGradesRequest)
	if err := c.Bind().Query(req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"message": "invalid query params",
			"error":   err.Error(),
		})
	}

	res, err := h.gradeService.GetMyGrades(studentID, req.Semester, req.Year)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"message": "can't get my grades",
			"error":   err.Error(),
		})
	}
	return c.Status(fiber.StatusOK).JSON(res)
}

// SubmitGrades — เก็บไว้เพื่อ backward compat แต่ไม่ได้ใช้แล้ว
func (h *GradeHandler) SubmitGrades(c fiber.Ctx) error {
	return c.Status(fiber.StatusGone).JSON(fiber.Map{
		"message": "endpoint deprecated, use POST /professor/grades for scores and POST /professor/grades/commit for grading",
	})
}
