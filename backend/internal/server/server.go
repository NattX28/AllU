package server

import (
	"fmt"
	"log"
	"os"
	"os/signal"
	"syscall"

	"github.com/NattX28/AllU/internal/handler"
	"github.com/NattX28/AllU/internal/routes"
	"github.com/NattX28/AllU/internal/services"
	"github.com/go-playground/validator/v10"

	"github.com/gofiber/fiber/v3"
	"github.com/gofiber/fiber/v3/middleware/cors"
	"github.com/redis/go-redis/v9"
	"gorm.io/gorm"
)

type structValidator struct {
	validator *validator.Validate
}

func (v *structValidator) Validate(out any) error {
	return v.validator.Struct(out)
}

func Start(db *gorm.DB, rdb *redis.Client) {
	app := fiber.New(fiber.Config{
		StructValidator: &structValidator{
			validator: validator.New(),
		},
	})

	var allowedOrigins []string
	if os.Getenv("FRONTEND_URL") != "" {
		allowedOrigins = append(allowedOrigins, os.Getenv("FRONTEND_URL"))
	}
	allowedOrigins = append(allowedOrigins, "http://localhost:3000")

	app.Use(cors.New(cors.Config{
		AllowOrigins:     allowedOrigins,
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization"},
		AllowCredentials: true,
	}))

	port := os.Getenv("PORT")
	if port == "" {
		port = "5000"
	}

	// Initialize
	// Auth
	authService := services.NewAuthService(db, rdb, os.Getenv("JWT_SECRET"))
	authHandler := handler.NewAuthHandler(authService)

	// User
	userService := services.NewUserService(db)
	userHandler := handler.NewUserHandler(userService)

	// Course
	courseService := services.NewCourseService(db, rdb)
	courseHandler := handler.NewCourseHandler(courseService)

	// Enroll
	enrollService := services.NewEnrollService(db, rdb)
	enrollHandler := handler.NewEnrollHandler(enrollService)

	if err := enrollService.SeedSeatsFromDB(); err != nil {
		log.Fatal("failed to seed seats:", err)
	}

	// Enrollment Period
	enrollmentPeriodService := services.NewEnrollmentPeriodService(db)
	enrollmentPeriodHandler := handler.NewEnrollmentPeriodHandler(enrollmentPeriodService)

	// Grade
	gradeService := services.NewGradeService(db)
	gradeHandler := handler.NewGradeHandler(gradeService)

	// Import
	importService := services.NewImportService(userService, courseService)
	importHandler := handler.NewImportHandler(importService)

	// Register routes
	app.Get("/", func(c fiber.Ctx) error {
		return c.SendString("Hello, From  AllU")
	})

	routes.Register(app, &routes.Handlers{
		Auth:             authHandler,
		User:             userHandler,
		Course:           courseHandler,
		Enroll:           enrollHandler,
		Grade:            gradeHandler,
		Import:           importHandler,
		EnrollmentPeriod: enrollmentPeriodHandler,
	})

	// Graceful shutdown
	signChan := make(chan os.Signal, 1)
	signal.Notify(signChan, os.Interrupt, syscall.SIGTERM)

	go func() {
		<-signChan
		log.Println("Graceful shutting down...")

		// Close redis connections
		if err := rdb.Close(); err != nil {
			log.Printf("Redis Close Error: %v\n", err)
		}

		// Close database connections
		if sqlDB, err := db.DB(); err == nil {
			sqlDB.Close()
		}

		// Close fiber app
		_ = app.Shutdown()
	}()

	// Start server with message that tells the user the server is running
	log.Printf("Server is running on port :%s", port)
	log.Fatal(app.Listen(fmt.Sprintf(":%s", port)))
}
