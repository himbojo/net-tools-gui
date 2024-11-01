export function useRateLimit(limit, interval) {
  return {
    isLimited: false,
    execute: (fn) => fn(),
  }
}
