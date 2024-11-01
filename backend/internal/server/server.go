// File: backend/internal/server/server.go

package server

import (
	"fmt"
	"net/http"
	"time"

	"github.com/himbojo/net-tools-gui/backend/internal/errors"
	"github.com/himbojo/net-tools-gui/backend/internal/logger"
	"github.com/himbojo/net-tools-gui/backend/internal/metrics"
)

// ResponseWriter wraps http.ResponseWriter to capture status codes
type ResponseWriter struct {
	http.ResponseWriter
	statusCode int
}

func (rw *ResponseWriter) WriteHeader(code int) {
	rw.statusCode = code
	rw.ResponseWriter.WriteHeader(code)
}

// LoggingMiddleware adds request logging
func LoggingMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()

		// Create custom response writer to capture status code
		rw := &ResponseWriter{w, http.StatusOK}

		// Process request
		next.ServeHTTP(rw, r)

		// Log request details
		duration := time.Since(start)
		logger.Info(
			"[%s] %s %s %d %v",
			r.Method,
			r.RequestURI,
			r.RemoteAddr,
			rw.statusCode,
			duration,
		)
	})
}

// MetricsMiddleware adds metrics recording
func MetricsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()

		// Create custom response writer to capture status code
		rw := &ResponseWriter{w, http.StatusOK}

		next.ServeHTTP(rw, r)

		duration := time.Since(start)
		var err error
		if rw.statusCode >= 400 {
			err = fmt.Errorf("request failed with status %d", rw.statusCode)
		}
		metrics.RecordMetric(metrics.MetricWebSocket, duration, err)
	})
}

// WriteError writes an error response in a consistent format
func WriteError(w http.ResponseWriter, err error) {
	var appErr *errors.AppError
	if e, ok := err.(*errors.AppError); ok {
		appErr = e
	} else {
		appErr = errors.NewInternalError(err)
	}

	status := appErr.HTTPStatusCode()
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)

	// Log error with appropriate level
	if status >= 500 {
		logger.Error(appErr.Error())
	} else {
		logger.Warn(appErr.Error())
	}
}

// WriteSuccess writes a success response in a consistent format
func WriteSuccess(w http.ResponseWriter, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	// Implementation depends on your JSON handling
}
