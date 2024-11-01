// File: backend/internal/executor/command.go

package executor

import (
	"bufio"
	"context"
	"fmt"
	"os/exec"
	"runtime"
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
	toolPaths map[string]string
	timeout   time.Duration
}

// NewExecutor creates a new CommandExecutor instance
func NewExecutor() *CommandExecutor {
	// Initialize with appropriate paths based on the operating system
	var pingPath, digPath, traceroutePath string

	switch runtime.GOOS {
	case "windows":
		pingPath = "ping"
		digPath = "dig"
		traceroutePath = "tracert"
	default: // linux, darwin, etc.
		pingPath = "/usr/bin/ping"
		digPath = "/usr/bin/dig"
		traceroutePath = "/usr/bin/traceroute"
	}

	return &CommandExecutor{
		toolPaths: map[string]string{
			"ping":       pingPath,
			"dig":        digPath,
			"traceroute": traceroutePath,
		},
		timeout: 60 * time.Second,
	}
}

func (e *CommandExecutor) buildCommand(tool, target string, params map[string]string) (*exec.Cmd, error) {
	toolPath, exists := e.toolPaths[tool]
	if !exists {
		return nil, fmt.Errorf("unsupported tool: %s", tool)
	}

	args := []string{}

	switch tool {
	case "ping":
		count := "4"
		if c, ok := params["count"]; ok && c != "" {
			count = c
		}

		switch runtime.GOOS {
		case "windows":
			args = []string{"-n", count, "-w", "2000", target}
		case "darwin":
			args = []string{"-c", count, "-t", "2", target}
		default: // linux
			args = []string{"-c", count, "-W", "2", "-O", target}
		}

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
		switch runtime.GOOS {
		case "windows":
			args = []string{"-h", maxHops, "-w", "2000", target}
		default:
			args = []string{"-m", maxHops, "-w", "2", target}
		}

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

	// Create pipes for stdout and stderr
	stdout, err := cmd.StdoutPipe()
	if err != nil {
		result.Error = fmt.Sprintf("failed to create stdout pipe: %v", err)
		result.EndTime = time.Now()
		outputChan <- result
		return
	}

	stderr, err := cmd.StderrPipe()
	if err != nil {
		result.Error = fmt.Sprintf("failed to create stderr pipe: %v", err)
		result.EndTime = time.Now()
		outputChan <- result
		return
	}

	// Start the command
	if err := cmd.Start(); err != nil {
		result.Error = fmt.Sprintf("failed to start command: %v", err)
		result.EndTime = time.Now()
		outputChan <- result
		return
	}

	// Channel to signal when reading is complete
	done := make(chan error, 1)

	// Read stdout in a goroutine
	go func() {
		scanner := bufio.NewScanner(stdout)
		for scanner.Scan() {
			line := scanner.Text()
			if line = strings.TrimSpace(line); line != "" {
				select {
				case outputChan <- CommandResult{
					Tool:      tool,
					Target:    target,
					Output:    line,
					StartTime: time.Now(),
				}:
				case <-ctx.Done():
					return
				}
			}
		}
		if err := scanner.Err(); err != nil {
			done <- err
		}
	}()

	// Read stderr in a goroutine
	go func() {
		scanner := bufio.NewScanner(stderr)
		var errOutput strings.Builder
		for scanner.Scan() {
			line := scanner.Text()
			if strings.TrimSpace(line) != "" {
				errOutput.WriteString(line + "\n")
			}
		}
		if errStr := strings.TrimSpace(errOutput.String()); errStr != "" {
			select {
			case outputChan <- CommandResult{
				Tool:      tool,
				Target:    target,
				Error:     errStr,
				StartTime: time.Now(),
			}:
			case <-ctx.Done():
			}
		}
	}()

	// Wait for command completion or context cancellation
	go func() {
		done <- cmd.Wait()
	}()

	select {
	case <-ctx.Done():
		if cmd.Process != nil {
			cmd.Process.Kill()
		}
		result.Error = "command execution timed out"
		result.EndTime = time.Now()
		outputChan <- result
		return

	case err := <-done:
		result.EndTime = time.Now()
		if err != nil && result.Error == "" {
			result.Error = err.Error()
			outputChan <- result
		}
		// Send a final result to indicate completion
		outputChan <- CommandResult{
			Tool:      tool,
			Target:    target,
			EndTime:   time.Now(),
			StartTime: result.StartTime,
		}
		return
	}
}
