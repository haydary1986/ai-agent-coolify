package llm

import (
	"bufio"
	"bytes"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"sync"
)

var (
	modelProgressMap = make(map[string]float64)
	progressMutex    sync.RWMutex
)

func GetModelProgress(modelName string) float64 {
	progressMutex.RLock()
	defer progressMutex.RUnlock()
	return modelProgressMap[modelName]
}

func setModelProgress(modelName string, progress float64) {
	progressMutex.Lock()
	defer progressMutex.Unlock()
	modelProgressMap[modelName] = progress
}

// GetOllamaURL returns the Ollama host URL from environment or default
func GetOllamaURL() string {
	// Force localhost since Ollama is running in the same container now
	return "http://127.0.0.1:11434"
}

type PullProgressResponse struct {
	Status    string `json:"status"`
	Digest    string `json:"digest,omitempty"`
	Total     int64  `json:"total,omitempty"`
	Completed int64  `json:"completed,omitempty"`
}

// PullModel sends a request to Ollama to download the model
func PullModel(modelName string) error {
	go func() {
		// Initialize progress
		setModelProgress(modelName, 0.1)

		ollamaURL := GetOllamaURL() + "/api/pull"
		
		payload := map[string]string{"name": modelName}
		jsonPayload, _ := json.Marshal(payload)

		log.Printf("Starting background pull for model: %s from %s", modelName, ollamaURL)
		
		resp, err := http.Post(ollamaURL, "application/json", bytes.NewBuffer(jsonPayload))
		if err != nil {
			log.Printf("failed to connect to Ollama: %v", err)
			setModelProgress(modelName, -1) // -1 indicates error
			return
		}
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusOK {
			log.Printf("ollama API returned status: %d", resp.StatusCode)
			setModelProgress(modelName, -1)
			return
		}

		// Keep the stream open and consume it until Ollama finishes downloading
		scanner := bufio.NewScanner(resp.Body)
		for scanner.Scan() {
			var p PullProgressResponse
			if err := json.Unmarshal(scanner.Bytes(), &p); err == nil {
				// Only track progress for large blobs (e.g. > 10MB) to avoid 0-100% jumping on metadata files
				if p.Total > 10000000 {
					percent := (float64(p.Completed) / float64(p.Total)) * 100
					setModelProgress(modelName, percent)
				} else if p.Status == "success" {
					setModelProgress(modelName, 100.0)
				}
			}
		}
		
		log.Printf("Model pull completed for %s!", modelName)
		setModelProgress(modelName, 100.0)
	}()
	
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

type TagsResponse struct {
	Models []struct {
		Name string `json:"name"`
	} `json:"models"`
}

// CheckModelExists queries Ollama to see if a specific model is already downloaded
func CheckModelExists(modelName string) bool {
	ollamaURL := GetOllamaURL() + "/api/tags"
	
	resp, err := http.Get(ollamaURL)
	if err != nil {
		return false
	}
	defer resp.Body.Close()

	var tagsResp TagsResponse
	if err := json.NewDecoder(resp.Body).Decode(&tagsResp); err != nil {
		return false
	}

	for _, m := range tagsResp.Models {
		if m.Name == modelName || m.Name == modelName+":latest" {
			return true
		}
	}
	return false
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
