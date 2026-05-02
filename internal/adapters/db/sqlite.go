package db

import (
	"log"

	"github.com/haydary1986/ai-agent-coolify/internal/core/domain"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

var DB *gorm.DB

// InitDatabase initializes the SQLite database and runs auto-migrations
func InitDatabase() {
	var err error
	DB, err = gorm.Open(sqlite.Open("gemma_agent.db"), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	})
	if err != nil {
		log.Fatalf("Failed to connect to SQLite database: %v", err)
	}

	// Auto-migrate domain models
	err = DB.AutoMigrate(&domain.SystemSettings{})
	if err != nil {
		log.Fatalf("Failed to migrate database: %v", err)
	}

	// Seed default settings if they don't exist
	seedDefaultSettings()
	log.Println("Database initialized and migrated successfully.")
}

func seedDefaultSettings() {
	var count int64
	DB.Model(&domain.SystemSettings{}).Where("key = ?", domain.SettingSystemName).Count(&count)
	if count == 0 {
		DB.Create(&domain.SystemSettings{Key: domain.SettingSystemName, Value: "Erticaz"})
	}

	DB.Model(&domain.SystemSettings{}).Where("key = ?", domain.SettingSystemLogo).Count(&count)
	if count == 0 {
		// Provide a default transparent logo or icon URL
		DB.Create(&domain.SystemSettings{Key: domain.SettingSystemLogo, Value: ""})
	}
}

// GetSetting retrieves a setting value by key
func GetSetting(key string) string {
	var setting domain.SystemSettings
	if err := DB.Where("key = ?", key).First(&setting).Error; err != nil {
		return ""
	}
	return setting.Value
}

// UpdateSetting updates a setting value by key
func UpdateSetting(key, value string) error {
	var setting domain.SystemSettings
	if err := DB.Where("key = ?", key).First(&setting).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return DB.Create(&domain.SystemSettings{Key: key, Value: value}).Error
		}
		return err
	}
	setting.Value = value
	return DB.Save(&setting).Error
}
