package database

import (
	"context"
	"log"
	"os"

	"github.com/redis/go-redis/v9"
)

var Ctx = context.Background()

func ConnnectRedis() *redis.Client {
	redisURL := os.Getenv("REDIS_URL")

	var opt *redis.Options
	var err error

	if redisURL != "" {
		opt, err = redis.ParseURL(redisURL)
		if err != nil {
			panic("Invalid Redis URL: " + err.Error())
		}
	} else {
		opt = &redis.Options{
			Addr: "localhost:6379",
		}
	}

	rdb := redis.NewClient(opt)

	if err := rdb.Ping(context.Background()).Err(); err != nil {
		panic("Redis connection failed: " + err.Error())
	}

	log.Println("Connected to Redis")

	return rdb
}
