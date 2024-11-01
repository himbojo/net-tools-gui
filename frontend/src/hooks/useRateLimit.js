import { useState, useCallback, useRef } from 'react'

export function useRateLimit(limit = 10, interval = 60000) {
  // Track request timestamps in a ref to persist between renders
  const requestTimestamps = useRef([])
  const [isLimited, setIsLimited] = useState(false)

  // Clean up old timestamps outside the window
  const cleanupTimestamps = useCallback(() => {
    const now = Date.now()
    const windowStart = now - interval
    requestTimestamps.current = requestTimestamps.current.filter(
      timestamp => timestamp > windowStart
    )
  }, [interval])

  // Check if we're within rate limits
  const checkRateLimit = useCallback(() => {
    cleanupTimestamps()
    return requestTimestamps.current.length < limit
  }, [cleanupTimestamps, limit])

  // Update rate limit status
  const updateLimitStatus = useCallback(() => {
    const limited = !checkRateLimit()
    setIsLimited(limited)
    
    // If we're limited, schedule a check to remove the limit
    if (limited) {
      const oldestTimestamp = requestTimestamps.current[0]
      const timeUntilUnlimited = oldestTimestamp + interval - Date.now()
      
      setTimeout(() => {
        cleanupTimestamps()
        setIsLimited(!checkRateLimit())
      }, timeUntilUnlimited)
    }
  }, [checkRateLimit, cleanupTimestamps, interval])

  // Execute function if within rate limits
  const execute = useCallback((fn) => {
    if (isLimited) {
      return
    }

    if (checkRateLimit()) {
      requestTimestamps.current.push(Date.now())
      updateLimitStatus()
      return fn()
    }
  }, [checkRateLimit, isLimited, updateLimitStatus])

  // Remaining requests in current window
  const remaining = limit - requestTimestamps.current.length

  // Time until next available request
  const nextAvailable = requestTimestamps.current.length > 0
    ? Math.max(0, requestTimestamps.current[0] + interval - Date.now())
    : 0

  return {
    isLimited,
    execute,
    remaining,
    nextAvailable,
    reset: useCallback(() => {
      requestTimestamps.current = []
      setIsLimited(false)
    }, [])
  }
}

// Example usage:
/*
const SomeComponent = () => {
  const { isLimited, execute, remaining } = useRateLimit(10, 60000)

  const handleClick = () => {
    execute(() => {
      // Your rate-limited action here
      console.log('Action executed!')
    })
  }

  return (
    <div>
      <button onClick={handleClick} disabled={isLimited}>
        Execute ({remaining} requests remaining)
      </button>
      {isLimited && <span>Rate limit reached</span>}
    </div>
  )
}
*/