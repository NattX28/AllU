package routes

import (
	"github.com/NattX28/AllU/internal/handler"
	"github.com/NattX28/AllU/internal/middleware"
	"github.com/gofiber/fiber/v3"
)

func SetupImportRoutes(r fiber.Router, handler *handler.ImportHandler) {
	admin := r.Group("/admin", middleware.AuthMiddleware, middleware.RequireRole("admin"))

	// Excel import endpoints
	admin.Post("/import/users", handler.ImportUsers)
	admin.Post("/import/courses", handler.ImportCourses)
}
