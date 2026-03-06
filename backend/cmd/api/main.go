package main

import (
	"log"

	"github.com/NattX28/AllU/internal/database"
	"github.com/joho/godotenv"
)

func main() {
	err := godotenv.Load()
	if err != nil {
		log.Println("Warning: .env file not found, using system env")
	}

	db := database.ConnectDataBase()

	rdb := database.ConnnectRedis()

	StartServer(db, rdb)
}
