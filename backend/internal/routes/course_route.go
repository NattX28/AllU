package routes

import (
	"github.com/NattX28/AllU/internal/handler"
	"github.com/NattX28/AllU/internal/middleware"
	"github.com/gofiber/fiber/v3"
)

func SetupCourseRoutes(r fiber.Router, h *handler.CourseHandler) {
	admin := r.Group("/admin", middleware.AuthMiddleware, middleware.RequireRole("admin"))

	admin.Post("/courses", h.CreateCourse)
	admin.Post("/section", h.CreateSection)
}
