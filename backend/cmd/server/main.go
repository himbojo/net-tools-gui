// File: backend/cmd/server/main.go
package main

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gorilla/websocket"
)

// Config holds server configuration
type Config struct {
	Port            string        `json:"port"`
	ReadTimeout     time.Duration `json:"readTimeout"`
	WriteTimeout    time.Duration `json:"writeTimeout"`
	ShutdownTimeout time.Duration `json:"shutdownTimeout"`
}

// CommandRequest represents an incoming network tool command request
type CommandRequest struct {
	Tool       string            `json:"tool"`       // ping, dig, or traceroute
	Target     string            `json:"target"`     // hostname or IP
	Parameters map[string]string `json:"parameters"` // tool-specific parameters
}

// CommandResponse represents the response from a network tool command
type CommandResponse struct {
	Tool      string    `json:"tool"`
	Target    string    `json:"target"`
	Output    string    `json:"output"`
	Error     string    `json:"error,omitempty"`
	StartTime time.Time `json:"startTime"`
	EndTime   time.Time `json:"endTime"`
}

var (
	upgrader = websocket.Upgrader{
		ReadBufferSize:  1024,
		WriteBufferSize: 1024,
		CheckOrigin: func(r *http.Request) bool {
			// TODO: Implement proper origin checking
			return true
		},
	}

	// Default configuration
	defaultConfig = Config{
		Port:            "8080",
		ReadTimeout:     time.Second * 15,
		WriteTimeout:    time.Second * 15,
		ShutdownTimeout: time.Second * 5,
	}
)

func main() {
	// Initialize logger
	log.SetFlags(log.LstdFlags | log.Lshortfile)
	log.Printf("Starting network tools server...")

	// Load configuration
	config := loadConfig()

	// Create server instance
	server := &http.Server{
		Addr:         ":" + config.Port,
		ReadTimeout:  config.ReadTimeout,
		WriteTimeout: config.WriteTimeout,
	}

	// Setup routes
	setupRoutes()

	// Start server in a goroutine
	go func() {
		log.Printf("Server listening on port %s", config.Port)
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Server error: %v", err)
		}
	}()

	// Graceful shutdown
	handleShutdown(server, config.ShutdownTimeout)
}

func loadConfig() Config {
	// TODO: Implement configuration loading from file or environment
	return defaultConfig
}

func setupRoutes() {
	// Health check endpoint
	http.HandleFunc("/health", handleHealth)

	// WebSocket endpoint
	http.HandleFunc("/ws", handleWebSocket)

	// API endpoints
	http.HandleFunc("/api/v1/tools", handleToolsList)
}

func handleHealth(w http.ResponseWriter, r *http.Request) {
	json.NewEncoder(w).Encode(map[string]string{"status": "OK"})
}

func handleWebSocket(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("WebSocket upgrade error: %v", err)
		return
	}
	defer conn.Close()

	// Start WebSocket handler
	handleWebSocketConnection(conn)
}

func handleWebSocketConnection(conn *websocket.Conn) {
	// TODO: Implement rate limiting
	// TODO: Implement command validation
	// TODO: Implement command execution

	for {
		var cmdReq CommandRequest
		err := conn.ReadJSON(&cmdReq)
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("WebSocket read error: %v", err)
			}
			break
		}

		// Process command
		go processCommand(conn, cmdReq)
	}
}

func processCommand(conn *websocket.Conn, req CommandRequest) {
	// TODO: Implement command execution logic
	response := CommandResponse{
		Tool:      req.Tool,
		Target:    req.Target,
		StartTime: time.Now(),
	}

	// Execute command based on tool type
	switch req.Tool {
	case "ping":
		// TODO: Implement ping command
	case "dig":
		// TODO: Implement dig command
	case "traceroute":
		// TODO: Implement traceroute command
	default:
		response.Error = "unsupported tool"
	}

	response.EndTime = time.Now()

	// Send response
	if err := conn.WriteJSON(response); err != nil {
		log.Printf("WebSocket write error: %v", err)
	}
}

func handleToolsList(w http.ResponseWriter, r *http.Request) {
	tools := []string{"ping", "dig", "traceroute"}
	json.NewEncoder(w).Encode(map[string][]string{"tools": tools})
}

func handleShutdown(server *http.Server, timeout time.Duration) {
	// Wait for interrupt signal
	stop := make(chan os.Signal, 1)
	signal.Notify(stop, os.Interrupt, syscall.SIGTERM)
	<-stop

	log.Printf("Shutting down server...")

	// Create shutdown context with timeout
	ctx, cancel := context.WithTimeout(context.Background(), timeout)
	defer cancel()

	// Attempt graceful shutdown
	if err := server.Shutdown(ctx); err != nil {
		log.Printf("Server shutdown error: %v", err)
	} else {
		log.Printf("Server shutdown complete")
	}
}
