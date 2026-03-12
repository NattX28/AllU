package routes

import (
	"github.com/NattX28/AllU/internal/handler"
	"github.com/NattX28/AllU/internal/middleware"
	"github.com/gofiber/fiber/v3"
)

func SetupAuthRoutes(r fiber.Router, h *handler.AuthHandler) {
	auth := r.Group("/auth")

	auth.Post("/login", h.Login)
	auth.Post("/logout", h.Logout, middleware.AuthMiddleware)
	auth.Post("/refresh", h.Refresh, middleware.AuthMiddleware)
}
