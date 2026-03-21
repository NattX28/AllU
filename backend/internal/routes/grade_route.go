package routes

import (
	"github.com/NattX28/AllU/internal/handler"
	"github.com/NattX28/AllU/internal/middleware"
	"github.com/gofiber/fiber/v3"
)

func SetupGradeRoutes(r fiber.Router, h *handler.GradeHandler) {
	// ─── Professor routes ────────────────────────────────────
	prof := r.Group("/professor", middleware.AuthMiddleware, middleware.RequireRole("professor"))

	prof.Get("/sections", h.GetProfessorSections)
	prof.Get("/sections/:id/students", h.GetClassList)

	// บันทึกคะแนนย่อย (ไม่ตัดเกรด)
	prof.Post("/grades", h.SaveScores)

	// ตัดเกรด — รายคน (enrollment_ids) หรือทั้งห้อง (commit_all: true)
	// NOTE: /grades/commit ต้องขึ้นก่อน /grades/:id เสมอ เพื่อไม่ให้ fiber match ผิด
	prof.Post("/grades/commit", h.CommitGrades)

	// ─── Student routes ──────────────────────────────────────
	student := r.Group("/grades", middleware.AuthMiddleware, middleware.RequireRole("student"))

	student.Get("/my", h.GetMyGrades)
}
