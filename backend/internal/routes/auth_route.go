package routes

import (
	"github.com/NattX28/AllU/internal/handler"
	"github.com/gofiber/fiber/v3"
)

func SetupAuthRoutes(r fiber.Router, h *handler.AuthHandler) {
	auth := r.Group("/auth")

	auth.Post("/login", h.Login)
}
