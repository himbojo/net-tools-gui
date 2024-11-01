// File: backend/internal/middleware/middleware.go

package middleware

import (
	"net/http"
	"sync"
	"time"
)

// RateLimiter implements rate limiting for requests
type RateLimiter struct {
	requests map[string][]time.Time
	mutex    sync.RWMutex
	window   time.Duration
	limit    int
}

// NewRateLimiter creates a new RateLimiter instance
func NewRateLimiter() *RateLimiter {
	return &RateLimiter{
		requests: make(map[string][]time.Time),
		window:   time.Minute,
		limit:    10,
	}
}

// cleanup removes old requests outside the window
func (rl *RateLimiter) cleanup(clientID string) {
	cutoff := time.Now().Add(-rl.window)
	valid := 0
	for _, t := range rl.requests[clientID] {
		if t.After(cutoff) {
			rl.requests[clientID][valid] = t
			valid++
		}
	}
	rl.requests[clientID] = rl.requests[clientID][:valid]
}

// Limit applies rate limiting to requests
func (rl *RateLimiter) Limit(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Get client identifier (IP address or session token)
		clientID := r.RemoteAddr

		rl.mutex.Lock()
		// Clean up old requests
		rl.cleanup(clientID)

		// Check rate limit
		if len(rl.requests[clientID]) >= rl.limit {
			rl.mutex.Unlock()
			http.Error(w, "Rate limit exceeded", http.StatusTooManyRequests)
			return
		}

		// Add current request
		rl.requests[clientID] = append(rl.requests[clientID], time.Now())
		rl.mutex.Unlock()

		next.ServeHTTP(w, r)
	})
}

// SecurityMiddleware implements security measures
type SecurityMiddleware struct {
	allowedOrigins map[string]bool
}

// NewSecurityMiddleware creates a new SecurityMiddleware instance
func NewSecurityMiddleware(origins []string) *SecurityMiddleware {
	allowedOrigins := make(map[string]bool)
	for _, origin := range origins {
		allowedOrigins[origin] = true
	}

	return &SecurityMiddleware{
		allowedOrigins: allowedOrigins,
	}
}

// Secure applies security measures to requests
func (sm *SecurityMiddleware) Secure(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Set security headers
		w.Header().Set("X-Content-Type-Options", "nosniff")
		w.Header().Set("X-Frame-Options", "DENY")
		w.Header().Set("X-XSS-Protection", "1; mode=block")
		w.Header().Set("Referrer-Policy", "strict-origin-when-cross-origin")
		w.Header().Set("Content-Security-Policy", "default-src 'self'")

		// Handle CORS
		origin := r.Header.Get("Origin")
		if origin != "" {
			if sm.allowedOrigins[origin] {
				w.Header().Set("Access-Control-Allow-Origin", origin)
				w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
				w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
				w.Header().Set("Access-Control-Max-Age", "86400")
			}

			// Handle preflight requests
			if r.Method == "OPTIONS" {
				w.WriteHeader(http.StatusOK)
				return
			}
		}

		next.ServeHTTP(w, r)
	})
}
