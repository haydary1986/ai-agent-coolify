package llm

import (
	"bufio"
	"bytes"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
)

// GetOllamaURL returns the Ollama host URL from environment or default
func GetOllamaURL() string {
	url := os.Getenv("OLLAMA_URL")
	if url == "" {
		// Default to host.docker.internal for local development or Coolify standalone
		// or "http://ollama:11434" if they use the Coolify service named 'ollama'
		url = "http://host.docker.internal:11434" 
	}
	return url
}

// PullModel sends a request to Ollama to download the model
func PullModel(modelName string) error {
	ollamaURL := GetOllamaURL() + "/api/pull"
	
	payload := map[string]string{"name": modelName}
	jsonPayload, _ := json.Marshal(payload)

	log.Printf("Starting pull for model: %s from %s", modelName, ollamaURL)
	
	resp, err := http.Post(ollamaURL, "application/json", bytes.NewBuffer(jsonPayload))
	if err != nil {
		return fmt.Errorf("failed to connect to Ollama: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("ollama API returned status: %d", resp.StatusCode)
	}

	// We only read a bit of the stream to confirm it started successfully
	// Fully downloading could take 5-10 minutes and we shouldn't block indefinitely 
	// without sending feedback, but for simplicity we will just return success 
	// that the job started. Ollama continues downloading in the background.
	scanner := bufio.NewScanner(resp.Body)
	if scanner.Scan() {
		log.Println("Ollama pull response:", scanner.Text())
	}
	
	return nil
}

type ChatMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type ChatRequest struct {
	Model    string        `json:"model"`
	Messages []ChatMessage `json:"messages"`
	Stream   bool          `json:"stream"`
}

type ChatResponse struct {
	Message ChatMessage `json:"message"`
	Error   string      `json:"error,omitempty"`
}

// GenerateResponse sends a chat prompt to Ollama and returns the response
func GenerateResponse(modelName, prompt string) (string, error) {
	ollamaURL := GetOllamaURL() + "/api/chat"

	reqBody := ChatRequest{
		Model: modelName,
		Messages: []ChatMessage{
			{Role: "user", Content: prompt},
		},
		Stream: false,
	}

	jsonPayload, _ := json.Marshal(reqBody)
	resp, err := http.Post(ollamaURL, "application/json", bytes.NewBuffer(jsonPayload))
	if err != nil {
		return "", fmt.Errorf("failed to connect to Ollama (is it running?): %v", err)
	}
	defer resp.Body.Close()

	var chatResp ChatResponse
	if err := json.NewDecoder(resp.Body).Decode(&chatResp); err != nil {
		return "", fmt.Errorf("failed to parse Ollama response: %v", err)
	}

	if chatResp.Error != "" {
		return "", fmt.Errorf("ollama error: %s", chatResp.Error)
	}

	return chatResp.Message.Content, nil
}
