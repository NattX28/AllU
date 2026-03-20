package routes

import (
	"github.com/NattX28/AllU/internal/handler"
	"github.com/NattX28/AllU/internal/middleware"
	"github.com/gofiber/fiber/v3"
)

func SetupEnrollRoutes(r fiber.Router, h *handler.EnrollHandler) {
	enroll := r.Group("/enroll", middleware.AuthMiddleware, middleware.RequireRole("student"))

	enroll.Get("/check-seats", h.CheckSeats)
	enroll.Post("/confirm", h.Confirm)
	enroll.Patch("/update", h.Update)
	enroll.Delete("/withdraw", h.Withdraw)
	enroll.Get("/history", h.GetHistory)
	enroll.Get("/schedule", h.GetSchedule)
}
