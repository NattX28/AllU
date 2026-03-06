package server

import (
	"log"
	"os"
	"os/signal"
	"syscall"

	"github.com/NattX28/AllU/internal/handler"
	"github.com/NattX28/AllU/internal/routes"
	"github.com/NattX28/AllU/internal/services"
	"github.com/gofiber/fiber/v3"
	"github.com/redis/go-redis/v9"
	"gorm.io/gorm"
)

func Start(db *gorm.DB, rdb *redis.Client) {
	app := fiber.New()

	// Initialize
	authService := services.NewAuthService(db, rdb, os.Getenv("JWT_SECRET"))
	authHandler := handler.NewAuthHandler(authService)

	// Register routes
	app.Get("/", func(c fiber.Ctx) error {
		return c.SendString("Hello, From  AllU")
	})

	routes.Register(app, routes.Handlers{
		Auth: authHandler,
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

	log.Fatal(app.Listen(":5000"))
}
