package routes

import (
	"github.com/NattX28/AllU/internal/handler"
	"github.com/gofiber/fiber/v3"
)

type Handlers struct {
	Auth *handler.AuthHandler
	User *handler.UserHandler
}

func Register(app *fiber.App, h *Handlers) {
	api := app.Group("/api")

	SetupAuthRoutes(api, h.Auth)
}
