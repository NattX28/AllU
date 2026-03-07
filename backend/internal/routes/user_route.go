package routes

import (
	"github.com/NattX28/AllU/internal/handler"
	"github.com/NattX28/AllU/internal/middleware"
	"github.com/gofiber/fiber/v3"
)

func SetUpUserRoutes(r fiber.Router, h *handler.UserHandler) {
	user := r.Group("/user")

	user.Get("/me", middleware.AuthMiddleware, h.GetMe)
	user.Patch("/me", middleware.AuthMiddleware, h.UpdateMe)
}
