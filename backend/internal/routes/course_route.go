package routes

import (
	"github.com/NattX28/AllU/internal/handler"
	"github.com/NattX28/AllU/internal/middleware"
	"github.com/gofiber/fiber/v3"
)

func SetupCourseRoutes(r fiber.Router, h *handler.CourseHandler) {
	// Public/Student routes

	// Admin routes
	admin := r.Group("/admin/courses", middleware.AuthMiddleware, middleware.RequireRole("admin"))

	// Course
	admin.Post("", h.CreateCourse)
	admin.Patch("/:id", h.UpdateCourse) // id ex. CPE101

	// Section
	admin.Post("/section", h.CreateSection)
	admin.Patch("/section/:id", h.UpdateSection) // id ex. 550e8400-e29b...
}
