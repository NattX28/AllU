package routes

import (
	"github.com/NattX28/AllU/internal/handler"
	"github.com/gofiber/fiber/v3"
)

type Handlers struct {
	Auth   *handler.AuthHandler
	User   *handler.UserHandler
	Course *handler.CourseHandler
	Enroll *handler.EnrollHandler
	Grade  *handler.GradeHandler
	Import *handler.ImportHandler
}

func Register(app *fiber.App, h *Handlers) {
	api := app.Group("/api")

	SetupAuthRoutes(api, h.Auth)
	SetupUserRoutes(api, h.User)
	SetupCourseRoutes(api, h.Course)
	SetupEnrollRoutes(api, h.Enroll)
	SetupGradeRoutes(api, h.Grade)
	SetupImportRoutes(api, h.Import)
}
