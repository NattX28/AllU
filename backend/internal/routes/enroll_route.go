package routes

import (
	"github.com/NattX28/AllU/internal/handler"
	"github.com/NattX28/AllU/internal/middleware"
	"github.com/gofiber/fiber/v3"
)

func SetupEnrollRoutes(r fiber.Router, h *handler.EnrollHandler) {
	enroll := r.Group("/enroll", middleware.AuthMiddleware, middleware.RequireRole("student"))

	// Polling
	enroll.Get("/check-seats", h.CheckSeats)
}
