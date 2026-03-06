package database

import (
	"context"
	"os"

	"github.com/redis/go-redis/v9"
)

var RDB *redis.Client
var Ctx = context.Background()

func ConnnectRedis() {
	addr := os.Getenv("REDIS_ADDR")
	if addr == "" {
		addr = "localhost:6379"
	}

	RDB = redis.NewClient(&redis.Options{
		Addr: addr,
	})

	if err := RDB.Ping(context.Background()).Err(); err != nil {
		panic("Redis connection failed: " + err.Error())
	}
}
