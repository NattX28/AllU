package database

import (
	"context"
	"log"
	"os"

	"github.com/redis/go-redis/v9"
)

var Ctx = context.Background()

func ConnnectRedis() *redis.Client {
	addr := os.Getenv("REDIS_ADDR")
	if addr == "" {
		addr = "localhost:6379"
	}

	rdb := redis.NewClient(&redis.Options{
		Addr: addr,
	})

	if err := rdb.Ping(context.Background()).Err(); err != nil {
		panic("Redis connection failed: " + err.Error())
	}

	log.Println("Connected to Redis")

	return rdb
}
