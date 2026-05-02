package http

import (
	"runtime"

	"github.com/gofiber/fiber/v2"
	"github.com/haydary1986/ai-agent-coolify/internal/adapters/db"
	"github.com/haydary1986/ai-agent-coolify/internal/core/domain"
	"github.com/haydary1986/ai-agent-coolify/internal/adapters/llm"
	"github.com/haydary1986/ai-agent-coolify/internal/workers"
)

// SkillRequest represents the payload for the /skills endpoint.
type SkillRequest struct {
	URL string `json:"url"`
}

// ChatRequest represents the payload for the /chat endpoint.
type ChatRequest struct {
	Message string `json:"message"`
}

// ModelRequest represents the payload for pulling models
type ModelRequest struct {
	ModelName string `json:"model_name"`
}

// SettingsRequest represents the payload for updating settings
type SettingsRequest struct {
	SystemName string `json:"system_name"`
	SystemLogo string `json:"system_logo"`
}

// SetupRoutes configures the API endpoints.
func SetupRoutes(app *fiber.App, learningPool *workers.LearningPool) {
	api := app.Group("/api")

	// --- System Settings ---
	api.Get("/settings", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{
			"system_name": db.GetSetting(domain.SettingSystemName),
			"system_logo": db.GetSetting(domain.SettingSystemLogo),
		})
	})

	api.Post("/settings", func(c *fiber.Ctx) error {
		var req SettingsRequest
		if err := c.BodyParser(&req); err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request"})
		}
		if req.SystemName != "" {
			db.UpdateSetting(domain.SettingSystemName, req.SystemName)
		}
		if req.SystemLogo != "" {
			db.UpdateSetting(domain.SettingSystemLogo, req.SystemLogo)
		}
		return c.JSON(fiber.Map{"message": "Settings updated successfully"})
	})

	// --- Status & Monitoring ---
	api.Get("/status", func(c *fiber.Ctx) error {
		var m runtime.MemStats
		runtime.ReadMemStats(&m)
		return c.JSON(fiber.Map{
			"status":      "running",
			"goroutines":  runtime.NumGoroutine(),
			"memory_mb":   m.Alloc / 1024 / 1024,
			"sys_mem_mb":  m.Sys / 1024 / 1024,
			"cpu_logical": runtime.NumCPU(),
		})
	})

	// --- Learning Tasks (Skills) ---
	api.Post("/skills", func(c *fiber.Ctx) error {
		var req SkillRequest
		if err := c.BodyParser(&req); err != nil || req.URL == "" {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "Invalid request, 'url' is required",
			})
		}
		learningPool.SubmitTask(req.URL)
		return c.Status(fiber.StatusAccepted).JSON(fiber.Map{
			"message": "URL added to learning queue",
			"url":     req.URL,
		})
	})

	// --- LLM Model Management ---
	api.Get("/model-status", func(c *fiber.Ctx) error {
		modelName := c.Query("model_name", "gemma2:9b")
		exists := llm.CheckModelExists(modelName)
		return c.JSON(fiber.Map{
			"model":  modelName,
			"loaded": exists,
		})
	})

	api.Post("/pull-model", func(c *fiber.Ctx) error {
		var req ModelRequest
		if err := c.BodyParser(&req); err != nil || req.ModelName == "" {
			req.ModelName = "gemma2:9b" // Default model
		}
		
		err := llm.PullModel(req.ModelName)
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
		}
		return c.JSON(fiber.Map{"message": "Model pull started in the background", "model": req.ModelName})
	})

	// --- Chat Interface ---
	api.Post("/chat", func(c *fiber.Ctx) error {
		var req ChatRequest
		if err := c.BodyParser(&req); err != nil || req.Message == "" {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "Invalid request, 'message' is required",
			})
		}
		
		response, err := llm.GenerateResponse("gemma2:9b", req.Message)
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
		}
		return c.JSON(fiber.Map{"response": response})
	})

	// --- Serve Frontend Static Files ---
	app.Static("/", "./frontend/dist")

	// Catch-all route for SPA (React Router)
	app.Use(func(c *fiber.Ctx) error {
		return c.SendFile("./frontend/dist/index.html")
	})
}

