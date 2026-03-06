package main

import (
	"log"
	"os"
	"os/signal"
	"syscall"

	"github.com/NattX28/AllU/internal/database"
	"github.com/gofiber/fiber/v3"
)

func StartServer() {
	app := fiber.New()

	// Register routes
	app.Get("/", func(c fiber.Ctx) {
		c.SendString("Hello, From  AllU")
	})

	// Graceful shutdown
	signChan := make(chan os.Signal, 1)
	signal.Notify(signChan, os.Interrupt, syscall.SIGTERM)

	go func() {
		<-signChan
		log.Println("Graceful shutting down...")

		// close database connections
		if err := database.RDB.Close(); err != nil {
			log.Printf("Redis Close Error: %v\n", err)
		}

		// Close fiber app
		_ = app.Shutdown()
	}()

	log.Fatal(app.Listen(":5000"))
}
