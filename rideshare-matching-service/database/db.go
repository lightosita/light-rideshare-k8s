

package database

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"os"
	"time" 
	
	_ "github.com/lib/pq" 
)


var Client *sql.DB
func Init() {
	connStr := os.Getenv("DATABASE_URL")
	if connStr == "" {
		log.Fatal("FATAL: DATABASE_URL environment variable not set.")
	}

	db, err := sql.Open("postgres", connStr)
	if err != nil {
		log.Fatalf("FATAL: Error opening database connection: %v", err)
	}

	db.SetMaxOpenConns(20)
	db.SetMaxIdleConns(20)
	db.SetConnMaxIdleTime(30 * time.Second) 

	if err := db.Ping(); err != nil {
		log.Fatalf("FATAL: Database ping failed: %v", err)
	}
	
	Client = db
	log.Println("✅ Successfully connected to PostgreSQL.")
}

func Close() {
	if Client != nil {
		Client.Close()
		log.Println("Database connection closed.")
	}
}

func CheckSchema(ctx context.Context) error {
    if _, err := Client.ExecContext(ctx, "SET search_path TO driver_service"); err != nil {
        return fmt.Errorf("failed to set search path to driver_service: %w", err)
    }
    return nil
}