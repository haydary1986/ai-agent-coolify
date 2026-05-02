package workers

import (
	"fmt"
	"log"
	"sync"
	"time"
)

// LearningTask represents a URL or repository to be processed.
type LearningTask struct {
	URL string
}

// LearningPool manages a pool of workers for processing learning tasks concurrently.
type LearningPool struct {
	Tasks  chan LearningTask
	Wg     sync.WaitGroup
	quit   chan struct{}
	worker int
}

// NewLearningPool initializes the concurrency engine with the specified number of workers.
func NewLearningPool(numWorkers int) *LearningPool {
	pool := &LearningPool{
		Tasks:  make(chan LearningTask, 100),
		quit:   make(chan struct{}),
		worker: numWorkers,
	}
	pool.start()
	return pool
}

func (p *LearningPool) start() {
	for i := 0; i < p.worker; i++ {
		p.Wg.Add(1)
		go p.workerRoutine(i)
	}
}

func (p *LearningPool) workerRoutine(id int) {
	defer p.Wg.Done()
	for {
		select {
		case task, ok := <-p.Tasks:
			if !ok {
				return // Channel closed, exit
			}
			p.processTask(id, task)
		case <-p.quit:
			return // Stop signal received
		}
	}
}

func (p *LearningPool) processTask(workerID int, task LearningTask) {
	log.Printf("[Worker %d] Started learning from: %s", workerID, task.URL)
	
	// Simulate scraping and Gemini supervision processing
	time.Sleep(2 * time.Second)
	
	// TODO: Add logic to scrape data, send raw data to Gemini API for structuring,
	// and save to ChromaDB for Gemma-4 to use.
	
	log.Printf("[Worker %d] Finished learning and indexing: %s", workerID, task.URL)
}

// SubmitTask adds a new task to the queue.
func (p *LearningPool) SubmitTask(url string) {
	p.Tasks <- LearningTask{URL: url}
}

// Stop gracefully shuts down the worker pool.
func (p *LearningPool) Stop() {
	close(p.quit)
	close(p.Tasks)
	p.Wg.Wait()
	fmt.Println("Learning pool stopped gracefully.")
}
