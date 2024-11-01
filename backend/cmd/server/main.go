// File: backend/cmd/server/main.go

package main

import (
	"context"
	"encoding/json"
	"flag"
	"log"
	"net/http"
	"os"
	"os/signal"
	"sync"
	"syscall"
	"time"

	"github.com/himbojo/net-tools-gui/backend/internal/executor"
	"github.com/himbojo/net-tools-gui/backend/internal/handlers"
	"github.com/himbojo/net-tools-gui/backend/internal/middleware"
	"github.com/himbojo/net-tools-gui/backend/internal/validator"
)

// Config holds server configuration
type Config struct {
	Port            string        `json:"port"`
	ReadTimeout     time.Duration `json:"readTimeout"`
	WriteTimeout    time.Duration `json:"writeTimeout"`
	ShutdownTimeout time.Duration `json:"shutdownTimeout"`
	AllowedOrigins  []string      `json:"allowedOrigins"`
}

// Server represents the HTTP server and its dependencies
type Server struct {
	config     Config
	httpServer *http.Server
	executor   *executor.CommandExecutor
	validator  *validator.Validator
	wsHandler  *handlers.WSHandler
}

func main() {
	// Parse command line flags
	configFile := flag.String("config", "config.json", "path to config file")
	flag.Parse()

	// Load configuration
	config, err := loadConfig(*configFile)
	if err != nil {
		log.Fatalf("Failed to load configuration: %v", err)
	}

	// Initialize components
	server := newServer(config)

	// Start server
	server.start()
}

func loadConfig(configFile string) (Config, error) {
	// Default configuration
	config := Config{
		Port:            "8080",
		ReadTimeout:     15 * time.Second,
		WriteTimeout:    15 * time.Second,
		ShutdownTimeout: 5 * time.Second,
		AllowedOrigins:  []string{"http://localhost:3000"},
	}

	// Try to load from file
	file, err := os.Open(configFile)
	if err == nil {
		defer file.Close()
		if err := json.NewDecoder(file).Decode(&config); err != nil {
			return config, err
		}
	}

	// Override with environment variables if present
	if port := os.Getenv("PORT"); port != "" {
		config.Port = port
	}

	return config, nil
}

func newServer(config Config) *Server {
	// Initialize components
	validator := validator.NewValidator()
	executor := executor.NewExecutor()
	wsHandler := handlers.NewWSHandler(executor, validator)

	// Create server instance
	server := &Server{
		config:    config,
		executor:  executor,
		validator: validator,
		wsHandler: wsHandler,
	}

	// Create router and set up routes
	mux := http.NewServeMux()
	server.setupRoutes(mux)

	// Create HTTP server
	server.httpServer = &http.Server{
		Addr:         ":" + config.Port,
		Handler:      server.middlewareChain(mux),
		ReadTimeout:  config.ReadTimeout,
		WriteTimeout: config.WriteTimeout,
	}

	return server
}

func (s *Server) setupRoutes(mux *http.ServeMux) {
	// Health check endpoint
	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		json.NewEncoder(w).Encode(map[string]string{"status": "OK"})
	})

	// WebSocket endpoint
	mux.HandleFunc("/ws", s.wsHandler.HandleConnection)

	// API endpoints
	mux.HandleFunc("/api/v1/tools", func(w http.ResponseWriter, r *http.Request) {
		tools := []string{"ping", "dig", "traceroute"}
		json.NewEncoder(w).Encode(map[string][]string{"tools": tools})
	})
}

func (s *Server) middlewareChain(handler http.Handler) http.Handler {
	// Create rate limiter
	rateLimiter := middleware.NewRateLimiter()

	// Create security middleware
	security := middleware.NewSecurityMiddleware(s.config.AllowedOrigins)

	// Chain middleware
	return security.Secure(
		rateLimiter.Limit(
			handler,
		),
	)
}

func (s *Server) start() {
	// Start server in a goroutine
	var wg sync.WaitGroup
	wg.Add(1)
	go func() {
		defer wg.Done()
		log.Printf("Server listening on port %s", s.config.Port)
		if err := s.httpServer.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Server error: %v", err)
		}
	}()

	// Wait for interrupt signal
	stop := make(chan os.Signal, 1)
	signal.Notify(stop, os.Interrupt, syscall.SIGTERM)
	<-stop

	// Graceful shutdown
	log.Printf("Shutting down server...")
	ctx, cancel := context.WithTimeout(context.Background(), s.config.ShutdownTimeout)
	defer cancel()

	if err := s.httpServer.Shutdown(ctx); err != nil {
		log.Printf("Server shutdown error: %v", err)
	}

	// Wait for server goroutine to finish
	wg.Wait()
	log.Printf("Server shutdown complete")
}
