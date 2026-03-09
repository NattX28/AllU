package routes

import (
	"github.com/NattX28/AllU/internal/handler"
	"github.com/gofiber/fiber/v3"
)

func SetupCourseRoutes(r fiber.Router, h *handler.CourseHandler) {
	course := r.Group("/course")

	course.Post("", h.CreateCourse)
}
