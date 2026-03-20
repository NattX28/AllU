package database

import (
	"fmt"
	"log"
	"os"

	"github.com/NattX28/AllU/internal/models"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func ConnectDataBase() *gorm.DB {
	dsn := fmt.Sprintf("postgres://%s:%s@%s:%s/%s?sslmode=require",
		os.Getenv("DB_USER"),
		os.Getenv("DB_PASSWORD"),
		os.Getenv("DB_HOST"),
		os.Getenv("DB_PORT"),
		os.Getenv("DB_NAME"),
	)

	var err error
	db, err := gorm.Open(postgres.New(postgres.Config{
		DSN:                  dsn,
		PreferSimpleProtocol: true,
	}), &gorm.Config{})

	if err != nil {
		log.Fatal("Failed to connect to database: ", err)
	}

	log.Printf("Connected to database: %s successfully", os.Getenv("DB_NAME"))

	// AutoMigrate(db)
	return db
}

func AutoMigrate(db *gorm.DB) {
	err := db.AutoMigrate(
		&models.User{},             // No FK
		&models.Course{},           // No FK
		&models.Student{},          // FK → User
		&models.Professor{},        // FK → User
		&models.RefreshToken{},     // FK → User
		&models.Section{},          // FK → Course, Professor
		&models.SectionSchedule{},  // FK → Section
		&models.EnrollmentPeriod{}, // No FK
		&models.Enrollment{},       // FK → Student, Section
	)
	if err != nil {
		log.Fatal("Failed to auto migrate: ", err)
	}

	log.Println("Auto migrated successfully")
}
