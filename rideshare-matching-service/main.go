package main

import (
	"log"
	"os" 
	"rideshare-matching-service/redis"
	"rideshare-matching-service/database"
	"rideshare-matching-service/server"
	"rideshare-matching-service/service"
	"github.com/joho/godotenv"
)

func main() {
	err := godotenv.Load()
	if err != nil {
		log.Println("Note: No .env file found or error loading it.")
	}


	tripServiceURL := os.Getenv("TRIP_SERVICE_URL")
	if tripServiceURL == "" {
		log.Fatal("CRITICAL: TRIP_SERVICE_URL is STILL empty after .env load. Check the .env file contents carefully.")
	}
	log.Printf("DIAGNOSTIC: TRIP_SERVICE_URL successfully loaded as: %s", tripServiceURL)

	redis.Init()

	database.Init()
	defer database.Close()

	go service.StartServiceListener()

	log.Println("Matching Service Starting on :3004")
	server.Start()
}