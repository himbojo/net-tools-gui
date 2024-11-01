// File: backend/internal/executor/command.go
// File: backend/internal/executor/command.go

package executor

import (
	"bytes"
	"context"
	"fmt"
	"os/exec"
	"strings"
	"time"
)

// CommandRequest represents a request to execute a network tool
type CommandRequest struct {
	Tool       string            `json:"tool"`
	Target     string            `json:"target"`
	Parameters map[string]string `json:"parameters"`
}

// CommandResult represents the result of a command execution
type CommandResult struct {
	Tool      string    `json:"tool"`
	Target    string    `json:"target"`
	Output    string    `json:"output"`
	Error     string    `json:"error,omitempty"`
	StartTime time.Time `json:"startTime"`
	EndTime   time.Time `json:"endTime"`
}

// CommandExecutor handles the execution of network tools
type CommandExecutor struct {
	// Allowed tools and their paths
	toolPaths map[string]string
	// Maximum execution time per command
	timeout time.Duration
}

// NewExecutor creates a new CommandExecutor instance
func NewExecutor() *CommandExecutor {
	return &CommandExecutor{
		toolPaths: map[string]string{
			"ping":       "/usr/bin/ping",
			"dig":        "/usr/bin/dig",
			"traceroute": "/usr/bin/traceroute",
		},
		timeout: 60 * time.Second,
	}
}

// buildCommand constructs the command with safe parameters
func (e *CommandExecutor) buildCommand(tool, target string, params map[string]string) (*exec.Cmd, error) {
	toolPath, exists := e.toolPaths[tool]
	if !exists {
		return nil, fmt.Errorf("unsupported tool: %s", tool)
	}

	// Basic command arguments
	args := []string{}

	switch tool {
	case "ping":
		count := "4"
		if c, ok := params["count"]; ok && c != "" {
			count = c
		}
		args = []string{"-c", count, "-W", "2", target}

	case "dig":
		recordType := "A"
		if t, ok := params["type"]; ok && t != "" {
			recordType = t
		}
		args = []string{"+nocomments", "+noquestion", recordType, target}

	case "traceroute":
		maxHops := "30"
		if h, ok := params["maxHops"]; ok && h != "" {
			maxHops = h
		}
		args = []string{"-m", maxHops, "-w", "2", target}

	default:
		return nil, fmt.Errorf("invalid tool specified")
	}

	cmd := exec.Command(toolPath, args...)
	return cmd, nil
}

// Execute runs a network tool command and streams the output
func (e *CommandExecutor) Execute(ctx context.Context, tool, target string, params map[string]string, outputChan chan<- CommandResult) {
	result := CommandResult{
		Tool:      tool,
		Target:    target,
		StartTime: time.Now(),
	}

	// Create a context with timeout
	ctx, cancel := context.WithTimeout(ctx, e.timeout)
	defer cancel()

	// Build the command
	cmd, err := e.buildCommand(tool, target, params)
	if err != nil {
		result.Error = err.Error()
		result.EndTime = time.Now()
		outputChan <- result
		return
	}

	// Set up output buffering
	var stdoutBuf, stderrBuf bytes.Buffer
	cmd.Stdout = &stdoutBuf
	cmd.Stderr = &stderrBuf

	// Start the command
	if err := cmd.Start(); err != nil {
		result.Error = fmt.Sprintf("failed to start command: %v", err)
		result.EndTime = time.Now()
		outputChan <- result
		return
	}

	// Create a channel for command completion
	done := make(chan error)
	go func() {
		done <- cmd.Wait()
	}()

	// Buffer for accumulating output
	var lastOutput string

	// Monitor command execution
	ticker := time.NewTicker(100 * time.Millisecond)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			// Context cancelled or timed out
			if cmd.Process != nil {
				cmd.Process.Kill()
			}
			result.Error = "command execution timed out"
			result.EndTime = time.Now()
			outputChan <- result
			return

		case err := <-done:
			// Command completed
			result.EndTime = time.Now()
			if err != nil {
				result.Error = stderrBuf.String()
				if result.Error == "" {
					result.Error = err.Error()
				}
			}
			finalOutput := stdoutBuf.String()
			if finalOutput != lastOutput {
				result.Output = finalOutput
				outputChan <- result
			}
			return

		case <-ticker.C:
			// Check for new output
			currentOutput := stdoutBuf.String()
			if currentOutput != lastOutput {
				// Send only the new output
				newOutput := strings.TrimPrefix(currentOutput, lastOutput)
				if newOutput != "" {
					result.Output = newOutput
					outputChan <- result
					lastOutput = currentOutput
				}
			}
		}
	}
}
