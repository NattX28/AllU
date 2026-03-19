package routes

import (
	"github.com/NattX28/AllU/internal/handler"
	"github.com/NattX28/AllU/internal/middleware"
	"github.com/gofiber/fiber/v3"
)

func SetupGradeRoutes(r fiber.Router, h *handler.GradeHandler) {
	// Professor routes
	prof := r.Group("/professor", middleware.AuthMiddleware, middleware.RequireRole("professor"))

	prof.Get("/sections", h.GetProfessorSections)

	prof.Post("/grades", h.SubmitGrades)

	prof.Get("/sections/:id/students", h.GetClassList)

	// Student routes
	student := r.Group("/grades", middleware.AuthMiddleware, middleware.RequireRole("student"))

	student.Get("/my", h.GetMyGrades)
}
