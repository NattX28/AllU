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

	// Confirm Enrollment
	enroll.Post("/confirm", h.Confirm)

	enroll.Patch("/update-schedule", h.UpdateSchedule)

	// Withdraw Enrollment
	enroll.Delete("/withdraw", h.Withdraw)

	// Get My Enrollments
	enroll.Get("/my", h.GetMyEnrollments)
}
