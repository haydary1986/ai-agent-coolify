package domain

import "gorm.io/gorm"

// Skill represents a knowledge source (URL, PDF, etc.) that the agent has learned or is learning.
type Skill struct {
	gorm.Model
	Source string `gorm:"uniqueIndex;not null"` // e.g., URL or File Path
	Type   string // "url", "pdf", "text"
	Status string // "pending", "processing", "completed", "failed"
}
