package main

import (
	"log"

	"github.com/NattX28/AllU/internal/database"
	"github.com/NattX28/AllU/internal/server"
	"github.com/joho/godotenv"
	"github.com/redis/go-redis/v9"
)

func main() {
	err := godotenv.Load()
	if err != nil {
		log.Println("Warning: .env file not found, using system env")
	}

	db := database.ConnectDataBase()

	// rdb := database.ConnnectRedis()

	// dummy redis
	dummyRdb := redis.NewClient(&redis.Options{
		Addr: "localhost:0", // port that not real exists
	})

	server.Start(db, dummyRdb)
}
