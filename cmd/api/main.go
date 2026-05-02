package main

import (
	"log"
	"os"
	"os/signal"
	"syscall"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/gofiber/fiber/v2/middleware/recover"

	"github.com/haydary1986/ai-agent-coolify/internal/adapters/http"
	"github.com/haydary1986/ai-agent-coolify/internal/workers"
)

func main() {
	// Initialize Fiber app
	app := fiber.New(fiber.Config{
		AppName:           "Gemma Autonomous Agent",
		EnablePrintRoutes: true,
	})

	// Middleware
	app.Use(logger.New())
	app.Use(recover.New())

	// Initialize Background Worker Pool (Concurrency Engine)
	// Example: Start pool with 5 concurrent workers
	learningPool := workers.NewLearningPool(5)
	log.Println("Learning Worker Pool initialized with 5 workers.")

	// Setup Routes
	http.SetupRoutes(app, learningPool)

	// Graceful Shutdown Channel
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)

	// Run Server
	go func() {
		port := ":8000"
		log.Printf("Server starting on port %s", port)
		if err := app.Listen(port); err != nil {
			log.Fatalf("Error starting server: %v", err)
		}
	}()

	// Wait for shutdown signal
	<-quit
	log.Println("Gracefully shutting down server...")

	// Stop workers
	learningPool.Stop()

	// Shutdown Fiber
	if err := app.Shutdown(); err != nil {
		log.Fatalf("Fiber Shutdown Error: %v", err)
	}

	log.Println("Server stopped.")
}
