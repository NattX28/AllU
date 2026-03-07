package routes

import (
	"github.com/NattX28/AllU/internal/handler"
	"github.com/NattX28/AllU/internal/middleware"
	"github.com/gofiber/fiber/v3"
)

func SetUpUserRoutes(r fiber.Router, h *handler.UserHandler) {
	user := r.Group("/user", middleware.AuthMiddleware)
	user.Get("/me", h.GetMe)
	user.Patch("/me", h.UpdateMe)

	// Admin routes
	// prefix /admin/users
	admin := r.Group("/admin/users", middleware.AuthMiddleware, middleware.RequireRole("admin"))
	admin.Get("", h.GetAllUsers)
}
