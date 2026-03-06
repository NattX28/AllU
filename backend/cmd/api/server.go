package main

import (
	"log"
	"os"
	"os/signal"
	"syscall"

	"github.com/gofiber/fiber/v3"
	"github.com/redis/go-redis/v9"
	"gorm.io/gorm"
)

func StartServer(db *gorm.DB, rdb *redis.Client) {
	app := fiber.New()

	// Initialize

	// Register routes
	app.Get("/", func(c fiber.Ctx) error {
		return c.SendString("Hello, From  AllU")
	})

	// Graceful shutdown
	signChan := make(chan os.Signal, 1)
	signal.Notify(signChan, os.Interrupt, syscall.SIGTERM)

	go func() {
		<-signChan
		log.Println("Graceful shutting down...")

		// close database connections
		if err := rdb.Close(); err != nil {
			log.Printf("Redis Close Error: %v\n", err)
		}

		// Close fiber app
		_ = app.Shutdown()
	}()

	log.Fatal(app.Listen(":5000"))
}
