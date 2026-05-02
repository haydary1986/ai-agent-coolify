package http

import (
	"runtime"

	"github.com/gofiber/fiber/v2"
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

// SetupRoutes configures the API endpoints.
func SetupRoutes(app *fiber.App, learningPool *workers.LearningPool) {
	api := app.Group("/api")

	// GET /status: Monitor system resource usage
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

	// POST /skills: Add a new URL/Repo to the learning queue
	api.Post("/skills", func(c *fiber.Ctx) error {
		var req SkillRequest
		if err := c.BodyParser(&req); err != nil || req.URL == "" {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "Invalid request, 'url' is required",
			})
		}

		// Submit task to background worker pool
		learningPool.SubmitTask(req.URL)

		return c.Status(fiber.StatusAccepted).JSON(fiber.Map{
			"message": "URL added to learning queue",
			"url":     req.URL,
		})
	})

	// POST /chat: Unified endpoint to communicate with Gemma-4
	api.Post("/chat", func(c *fiber.Ctx) error {
		var req ChatRequest
		if err := c.BodyParser(&req); err != nil || req.Message == "" {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "Invalid request, 'message' is required",
			})
		}

		// TODO: Call local Gemma via Ollama API
		// Simulated response for scaffold
		mockResponse := "Gemma-4 (Local) received: " + req.Message

		return c.JSON(fiber.Map{
			"response": mockResponse,
		})
	})
}
