import { useState, useEffect, useCallback } from 'react'

// Cache for recent DNS validation results
const dnsValidationCache = new Map()

// Regular expressions for validation
const patterns = {
  // Matches IPv4 addresses
  ipv4: /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/,
  
  // Matches IPv6 addresses
  ipv6: /^(?:(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|(?:[0-9a-fA-F]{1,4}:){1,7}:|(?:[0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|(?:[0-9a-fA-F]{1,4}:){1,5}(?::[0-9a-fA-F]{1,4}){1,2}|(?:[0-9a-fA-F]{1,4}:){1,4}(?::[0-9a-fA-F]{1,4}){1,3}|(?:[0-9a-fA-F]{1,4}:){1,3}(?::[0-9a-fA-F]{1,4}){1,4}|(?:[0-9a-fA-F]{1,4}:){1,2}(?::[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:(?:(?::[0-9a-fA-F]{1,4}){1,6})|:(?:(?::[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(?::[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(?:ffff(?::0{1,4}){0,1}:){0,1}(?:(?:25[0-5]|(?:2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(?:25[0-5]|(?:2[0-4]|1{0,1}[0-9]){0,1}[0-9])|(?:[0-9a-fA-F]{1,4}:){1,4}:(?:(?:25[0-5]|(?:2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(?:25[0-5]|(?:2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/,
  
  // Matches hostnames (RFC 1123)
  hostname: /^([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9\-]*[a-zA-Z0-9])$/,
  
  // Matches domain names
  domain: /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/
}

// Custom hook for hostname resolution
export function useHostnameValidation() {
  const [isValidating, setIsValidating] = useState(false)
  const [isValid, setIsValid] = useState(false)
  
  const validate = useCallback(async (hostname) => {
    if (!hostname) return false
    
    // Check cache first
    if (dnsValidationCache.has(hostname)) {
      const { isValid, timestamp } = dnsValidationCache.get(hostname)
      // Cache results for 5 minutes
      if (Date.now() - timestamp < 5 * 60 * 1000) {
        return isValid
      }
      dnsValidationCache.delete(hostname)
    }
    
    setIsValidating(true)
    try {
      // Simple DNS resolution check
      const valid = await new Promise((resolve) => {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => {
          controller.abort()
          resolve(false)
        }, 5000)
        
        fetch(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(hostname)}`, {
          headers: { 'Accept': 'application/dns-json' },
          signal: controller.signal
        })
          .then(response => response.json())
          .then(data => {
            clearTimeout(timeoutId)
            resolve(data.Status === 0)
          })
          .catch(() => {
            clearTimeout(timeoutId)
            resolve(false)
          })
      })
      
      // Cache the result
      dnsValidationCache.set(hostname, {
        isValid: valid,
        timestamp: Date.now()
      })
      
      setIsValid(valid)
      return valid
    } finally {
      setIsValidating(false)
    }
  }, [])
  
  return { isValidating, isValid, validate }
}

// Validates hostname or IP address
export const validateHost = (host) => {
  if (!host || typeof host !== 'string') return false
  
  // Remove trailing dots
  host = host.replace(/\.$/, '')
  
  // Check if empty or too long
  if (host.length === 0 || host.length > 253) return false
  
  // Check for invalid characters
  if (/[^a-zA-Z0-9.-]/.test(host)) return false
  
  // Check if it's an IP address
  if (patterns.ipv4.test(host) || patterns.ipv6.test(host)) return true
  
  // Check if it's a valid domain name
  if (patterns.domain.test(host)) {
    // Validate each part
    const parts = host.split('.')
    return parts.every(part => 
      part.length <= 63 && patterns.hostname.test(part)
    )
  }
  
  return false
}

// Tool-specific parameter validation
export const validateToolParams = (tool, params) => {
  if (!params || typeof params !== 'object') return false
  
  const validators = {
    ping: (params) => {
      const count = parseInt(params.count)
      return (
        Number.isInteger(count) &&
        count >= 1 &&
        count <= 10
      )
    },
    
    dig: (params) => {
      const validTypes = ['A', 'AAAA', 'MX', 'NS', 'TXT', 'SOA']
      return (
        params.type &&
        typeof params.type === 'string' &&
        validTypes.includes(params.type.toUpperCase())
      )
    },
    
    traceroute: (params) => {
      const maxHops = parseInt(params.maxHops)
      return (
        Number.isInteger(maxHops) &&
        maxHops >= 1 &&
        maxHops <= 30
      )
    }
  }
  
  return validators[tool] ? validators[tool](params) : false
}

// Helper function to format validation errors
export const getValidationError = (tool, params) => {
  if (!validateToolParams(tool, params)) {
    switch (tool) {
      case 'ping':
        return 'Ping count must be between 1 and 10'
      case 'dig':
        return 'Invalid DNS record type'
      case 'traceroute':
        return 'Max hops must be between 1 and 30'
      default:
        return 'Invalid parameters'
    }
  }
  return null
}

// Export a custom hook for complete input validation
export function useInputValidation(tool) {
  const { isValidating, validate } = useHostnameValidation()
  const [error, setError] = useState(null)
  
  const validateInput = useCallback(async (host, params) => {
    // Reset error
    setError(null)
    
    // Basic host validation
    if (!validateHost(host)) {
      setError('Invalid hostname or IP address')
      return false
    }
    
    // Parameter validation
    const paramError = getValidationError(tool, params)
    if (paramError) {
      setError(paramError)
      return false
    }
    
    // DNS validation for hostnames (skip for IP addresses)
    if (!patterns.ipv4.test(host) && !patterns.ipv6.test(host)) {
      const isValid = await validate(host)
      if (!isValid) {
        setError('Unable to resolve hostname')
        return false
      }
    }
    
    return true
  }, [tool, validate])
  
  return {
    validateInput,
    isValidating,
    error
  }
}