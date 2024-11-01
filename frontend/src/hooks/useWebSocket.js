export function useWebSocket(url) {
  return {
    connected: false,
    sendMessage: () => {},
    lastMessage: null,
  }
}
