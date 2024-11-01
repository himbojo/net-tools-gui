// File: backend/internal/errors/errors.go

package errors

import (
	"fmt"
	"net/http"
)

// ErrorType represents different types of errors in the application
type ErrorType int

const (
	ErrorTypeInternal ErrorType = iota
	ErrorTypeValidation
	ErrorTypeRateLimit
	ErrorTypeTimeout
	ErrorTypeExecution
)

// AppError represents an application error
type AppError struct {
	Type    ErrorType
	Message string
	Err     error
}

func (e *AppError) Error() string {
	if e.Err != nil {
		return fmt.Sprintf("%s: %v", e.Message, e.Err)
	}
	return e.Message
}

// HTTPStatusCode returns the appropriate HTTP status code for the error type
func (e *AppError) HTTPStatusCode() int {
	switch e.Type {
	case ErrorTypeValidation:
		return http.StatusBadRequest
	case ErrorTypeRateLimit:
		return http.StatusTooManyRequests
	case ErrorTypeTimeout:
		return http.StatusGatewayTimeout
	case ErrorTypeExecution:
		return http.StatusInternalServerError
	default:
		return http.StatusInternalServerError
	}
}

// Error constructors
func NewValidationError(message string) *AppError {
	return &AppError{
		Type:    ErrorTypeValidation,
		Message: message,
	}
}

func NewRateLimitError() *AppError {
	return &AppError{
		Type:    ErrorTypeRateLimit,
		Message: "Rate limit exceeded",
	}
}

func NewTimeoutError() *AppError {
	return &AppError{
		Type:    ErrorTypeTimeout,
		Message: "Operation timed out",
	}
}

func NewExecutionError(err error) *AppError {
	return &AppError{
		Type:    ErrorTypeExecution,
		Message: "Command execution failed",
		Err:     err,
	}
}

func NewInternalError(err error) *AppError {
	return &AppError{
		Type:    ErrorTypeInternal,
		Message: "Internal server error",
		Err:     err,
	}
}
