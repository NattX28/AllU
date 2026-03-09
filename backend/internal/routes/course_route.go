package routes

import (
	"github.com/NattX28/AllU/internal/handler"
	"github.com/NattX28/AllU/internal/middleware"
	"github.com/gofiber/fiber/v3"
)

func SetupCourseRoutes(r fiber.Router, h *handler.CourseHandler) {
	admin := r.Group("/admin", middleware.AuthMiddleware, middleware.RequireRole("admin"))

	// Course
	admin.Post("/courses", h.CreateCourse)
	admin.Patch("/courses/:id", h.UpdateCourse) // id ex. CPE101

	// Section
	admin.Post("/section", h.CreateSection)
}
