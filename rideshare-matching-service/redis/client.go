package redis

import (
    "context"
    "crypto/tls"
    "encoding/json"
    "log"
    "os"

    "github.com/joho/godotenv"
    "github.com/redis/go-redis/v9"
)

var Client *redis.Client
var Ctx = context.Background()

func Init() {
    _ = godotenv.Load()

    redisURL := os.Getenv("REDIS_URL")
    if redisURL == "" {
        log.Fatal("REDIS_URL environment variable is required")
    }

    opt, err := redis.ParseURL(redisURL)
    if err != nil {
        log.Fatal("Invalid REDIS_URL:", err)
    }

    // Check if TLS should be enabled
    if os.Getenv("REDIS_TLS") == "true" {
        opt.TLSConfig = &tls.Config{
            InsecureSkipVerify: true, // only needed for self-signed certs
        }
    } else {
        opt.TLSConfig = nil // disable TLS for local Redis
    }

    Client = redis.NewClient(opt)

    if err := Client.Ping(Ctx).Err(); err != nil {
        log.Fatal("Cannot connect to Redis:", err)
    }

    log.Println("✅ Redis connected successfully")
}

func Publish(channel string, payload any) error {
    data, err := json.Marshal(payload)
    if err != nil {
        return err
    }
    return Client.Publish(Ctx, channel, data).Err()
}
