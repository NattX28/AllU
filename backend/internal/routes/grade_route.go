package routes

import (
	"github.com/NattX28/AllU/internal/handler"
	"github.com/NattX28/AllU/internal/middleware"
	"github.com/gofiber/fiber/v3"
)

func SetupGradeRoutes(r fiber.Router, h *handler.GradeHandler) {
	prof := r.Group("/professor", middleware.AuthMiddleware, middleware.RequireRole("professor"))

	prof.Get("/sections", h.GetProfessorSections)

	prof.Post("/grades", h.SubmitGrades)
}
