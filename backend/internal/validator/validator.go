// File: backend/internal/validator/validator.go

package validator

import (
	"fmt"
	"net"
	"regexp"
	"strconv"
	"strings"
)

// Validator handles input validation
type Validator struct {
	// Cached compiled regexes
	hostnameRegex *regexp.Regexp
	ipv4Regex     *regexp.Regexp
	ipv6Regex     *regexp.Regexp
}

// NewValidator creates a new Validator instance
func NewValidator() *Validator {
	return &Validator{
		hostnameRegex: regexp.MustCompile(`^([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9\-]*[a-zA-Z0-9])(\.[a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9\-]*[a-zA-Z0-9])*$`),
		ipv4Regex:     regexp.MustCompile(`^(\d{1,3}\.){3}\d{1,3}$`),
		ipv6Regex:     regexp.MustCompile(`^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::1$`),
	}
}

// ValidateCommand validates command input
func (v *Validator) ValidateCommand(tool, target string, params map[string]string) error {
	// Validate tool
	if err := v.validateTool(tool); err != nil {
		return err
	}

	// Validate target
	if err := v.validateTarget(target); err != nil {
		return err
	}

	// Validate parameters
	return v.validateParams(tool, params)
}

// validateTool checks if the tool is supported
func (v *Validator) validateTool(tool string) error {
	switch tool {
	case "ping", "dig", "traceroute":
		return nil
	default:
		return fmt.Errorf("unsupported tool: %s", tool)
	}
}

// validateTarget checks if the target is valid
func (v *Validator) validateTarget(target string) error {
	target = strings.TrimSpace(target)
	if target == "" {
		return fmt.Errorf("empty target")
	}

	if len(target) > 253 {
		return fmt.Errorf("target too long")
	}

	// Check if it's an IP address
	if v.ipv4Regex.MatchString(target) {
		if ip := net.ParseIP(target); ip == nil {
			return fmt.Errorf("invalid IPv4 address")
		}
		return nil
	}

	if v.ipv6Regex.MatchString(target) {
		if ip := net.ParseIP(target); ip == nil {
			return fmt.Errorf("invalid IPv6 address")
		}
		return nil
	}

	// Check if it's a valid hostname
	if !v.hostnameRegex.MatchString(target) {
		return fmt.Errorf("invalid hostname")
	}

	// Additional hostname validation
	parts := strings.Split(target, ".")
	for _, part := range parts {
		if len(part) > 63 {
			return fmt.Errorf("hostname label too long")
		}
	}

	return nil
}

// validateParams checks tool-specific parameters
func (v *Validator) validateParams(tool string, params map[string]string) error {
	switch tool {
	case "ping":
		return v.validatePingParams(params)
	case "dig":
		return v.validateDigParams(params)
	case "traceroute":
		return v.validateTracerouteParams(params)
	default:
		return fmt.Errorf("invalid tool")
	}
}

// validatePingParams validates ping-specific parameters
func (v *Validator) validatePingParams(params map[string]string) error {
	if count, ok := params["count"]; ok {
		n, err := strconv.Atoi(count)
		if err != nil {
			return fmt.Errorf("invalid ping count")
		}
		if n < 1 || n > 10 {
			return fmt.Errorf("ping count must be between 1 and 10")
		}
	}
	return nil
}

// validateDigParams validates dig-specific parameters
func (v *Validator) validateDigParams(params map[string]string) error {
	if recordType, ok := params["type"]; ok {
		validTypes := map[string]bool{
			"A":     true,
			"AAAA":  true,
			"MX":    true,
			"NS":    true,
			"TXT":   true,
			"SOA":   true,
			"CNAME": true,
			"PTR":   true,
		}
		if !validTypes[strings.ToUpper(recordType)] {
			return fmt.Errorf("invalid DNS record type")
		}
	}
	return nil
}

// validateTracerouteParams validates traceroute-specific parameters
func (v *Validator) validateTracerouteParams(params map[string]string) error {
	if maxHops, ok := params["maxHops"]; ok {
		n, err := strconv.Atoi(maxHops)
		if err != nil {
			return fmt.Errorf("invalid max hops value")
		}
		if n < 1 || n > 30 {
			return fmt.Errorf("max hops must be between 1 and 30")
		}
	}
	return nil
}

// ValidateRateLimit checks if the client has exceeded rate limits
func (v *Validator) ValidateRateLimit(clientID string, requestCount int, windowSeconds int) error {
	if requestCount > 10 {
		return fmt.Errorf("rate limit exceeded: maximum 10 requests per %d seconds", windowSeconds)
	}
	return nil
}

// SanitizeOutput cleans command output for safe display
func (v *Validator) SanitizeOutput(output string) string {
	// Remove any control characters except newline and tab
	sanitized := strings.Map(func(r rune) rune {
		if r == '\n' || r == '\t' || (r >= 32 && r <= 126) {
			return r
		}
		return -1
	}, output)

	// Limit output length
	const maxLength = 10000
	if len(sanitized) > maxLength {
		return sanitized[:maxLength] + "\n... (output truncated)"
	}

	return sanitized
}
