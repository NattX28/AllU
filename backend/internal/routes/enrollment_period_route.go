package routes

import (
	"github.com/NattX28/AllU/internal/handler"
	"github.com/NattX28/AllU/internal/middleware"
	"github.com/gofiber/fiber/v3"
)

func SetupEnrollmentPeriodRoutes(r fiber.Router, h *handler.EnrollmentPeriodHandler) {
	// Student/frontend — check if there is an active enrollment period
	r.Get("/enrollment-period/active",
		middleware.AuthMiddleware,
		h.GetActive,
	)

	// Admin — manage enrollment period
	admin := r.Group("/admin/enrollment-period",
		middleware.AuthMiddleware,
		middleware.RequireRole("admin"),
	)
	admin.Post("", h.Create)
	admin.Patch("/:id", h.Update)
}
