package main

import (
	"log"

	"github.com/NattX28/AllU/internal/database"
	"github.com/NattX28/AllU/internal/seeder"
	"github.com/joho/godotenv"
)

func main() {
	if err := godotenv.Load(); err != nil {
		log.Fatal("Warning: .env file not found, using system env")
	}

	db := database.ConnectDataBase()

	sqlDB, err := db.DB()
	if err != nil {
		log.Fatal("Failed to get sql.DB from gorm:", err)
	}
	defer sqlDB.Close()

	seeder.Run(db)
}
