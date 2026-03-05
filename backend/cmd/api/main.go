package main

import (
	"log"

	"github.com/NattX28/AllU/database"
	"github.com/gofiber/fiber/v3"
	"github.com/joho/godotenv"
)

func main() {
	godotenv.Load()

	database.ConnectDataBase()

	app := fiber.New()

	app.Get("/", func(c fiber.Ctx) {
		c.SendString("Hello, From  AllU")
	})

	log.Fatal(app.Listen(":5000"))
}
