// File: backend/internal/handlers/websocket.go

package handlers

import (
	"context"
	"log"
	"net/http"
	"sync"
	"time"

	"github.com/gorilla/websocket"
	"github.com/himbojo/net-tools-gui/backend/internal/executor"
	"github.com/himbojo/net-tools-gui/backend/internal/validator"
)

// WSHandler handles WebSocket connections
type WSHandler struct {
	upgrader       websocket.Upgrader
	executor       *executor.CommandExecutor
	validator      *validator.Validator
	activeClients  map[*websocket.Conn]bool
	clientsMutex   sync.RWMutex
	maxConcurrent  int
	writeTimeout   time.Duration
	messageTimeout time.Duration
}

// NewWSHandler creates a new WSHandler instance
func NewWSHandler(exec *executor.CommandExecutor, val *validator.Validator) *WSHandler {
	return &WSHandler{
		upgrader: websocket.Upgrader{
			ReadBufferSize:  1024,
			WriteBufferSize: 1024,
			CheckOrigin: func(r *http.Request) bool {
				// TODO: Implement proper origin checking
				return true
			},
		},
		executor:       exec,
		validator:      val,
		activeClients:  make(map[*websocket.Conn]bool),
		maxConcurrent:  5,
		writeTimeout:   10 * time.Second,
		messageTimeout: 60 * time.Second,
	}
}

// HandleConnection processes WebSocket connections
func (h *WSHandler) HandleConnection(w http.ResponseWriter, r *http.Request) {
	// Upgrade HTTP connection to WebSocket
	conn, err := h.upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("WebSocket upgrade error: %v", err)
		return
	}

	// Register client
	h.clientsMutex.Lock()
	h.activeClients[conn] = true
	h.clientsMutex.Unlock()

	// Ensure cleanup on disconnect
	defer func() {
		h.clientsMutex.Lock()
		delete(h.activeClients, conn)
		h.clientsMutex.Unlock()
		conn.Close()
	}()

	// Set read deadline for first message
	conn.SetReadDeadline(time.Now().Add(h.messageTimeout))

	// Process incoming messages
	for {
		var cmdReq executor.CommandRequest
		err := conn.ReadJSON(&cmdReq)
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("WebSocket read error: %v", err)
			}
			break
		}

		// Validate request
		if err := h.validator.ValidateCommand(cmdReq.Tool, cmdReq.Target, cmdReq.Parameters); err != nil {
			h.sendError(conn, "validation error", err.Error())
			continue
		}

		// Create output channel and context
		outputChan := make(chan executor.CommandResult)
		ctx, cancel := context.WithTimeout(context.Background(), h.messageTimeout)

		// Execute command
		go func() {
			defer cancel()
			h.executor.Execute(ctx, cmdReq.Tool, cmdReq.Target, cmdReq.Parameters, outputChan)
		}()

		// Stream results back to client
		go h.streamResults(conn, outputChan, ctx)

		// Reset read deadline for next message
		conn.SetReadDeadline(time.Now().Add(h.messageTimeout))
	}
}

// streamResults sends command results back to the client
func (h *WSHandler) streamResults(conn *websocket.Conn, outputChan chan executor.CommandResult, ctx context.Context) {
	for {
		select {
		case <-ctx.Done():
			return
		case result, ok := <-outputChan:
			if !ok {
				return
			}
			h.clientsMutex.RLock()
			if !h.activeClients[conn] {
				h.clientsMutex.RUnlock()
				return
			}
			h.clientsMutex.RUnlock()

			conn.SetWriteDeadline(time.Now().Add(h.writeTimeout))
			if err := conn.WriteJSON(result); err != nil {
				log.Printf("WebSocket write error: %v", err)
				return
			}
		}
	}
}

// sendError sends an error message to the client
func (h *WSHandler) sendError(conn *websocket.Conn, errType, message string) {
	conn.SetWriteDeadline(time.Now().Add(h.writeTimeout))
	err := conn.WriteJSON(map[string]string{
		"error":     errType,
		"message":   message,
		"timestamp": time.Now().Format(time.RFC3339),
	})
	if err != nil {
		log.Printf("Error sending error message: %v", err)
	}
}
