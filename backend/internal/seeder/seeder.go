package seeder

import (
	"log"

	"github.com/NattX28/AllU/internal/models"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

func Run(db *gorm.DB) {
	seedAdmin(db)
}

func seedAdmin(db *gorm.DB) {
	// Check admin already exists
	var count int64
	db.Model(&models.User{}).Where("role = ?", models.RoleAdmin).Count(&count)
	if count > 0 {
		log.Println("Admin already exists")
		return
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte("admin1234"), bcrypt.DefaultCost)
	if err != nil {
		log.Fatal("Failed to generate hashed password: ", err)
	}

	admin := models.User{
		Name:     "Admin",
		Username: "admin",
		Email:    "admin@email.kmutnb.ac.th",
		Password: string(hashedPassword),
		Role:     models.RoleAdmin,
	}

	if err := db.Create(&admin).Error; err != nil {
		log.Fatal("Failed to create admin: ", err)
	}

	log.Println("Admin seeded successfully")
}
