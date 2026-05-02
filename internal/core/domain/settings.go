package domain

import "gorm.io/gorm"

// SystemSettings holds the configuration for the UI
type SystemSettings struct {
	gorm.Model
	Key   string `gorm:"uniqueIndex"`
	Value string
}

// Pre-defined setting keys
const (
	SettingSystemName = "system_name"
	SettingSystemLogo = "system_logo"
)
