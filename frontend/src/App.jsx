import { useState, useEffect } from 'preact/hooks'
import Sidebar from './components/Sidebar'
import Ping from './pages/Ping'
import Dig from './pages/Dig'
import Traceroute from './pages/Traceroute'
import { useWebSocket } from './hooks/useWebSocket'

const STORAGE_KEY = 'nettools-state'

export default function App() {
  // Load initial state from localStorage
  const loadInitialState = () => {
    const savedState = localStorage.getItem(STORAGE_KEY)
    if (savedState) {
      return JSON.parse(savedState)
    }
    return {
      activeTool: 'ping',
      toolStates: {
        ping: { target: '', params: { count: '4' }, output: '' },
        dig: { target: '', params: { type: 'A' }, output: '' },
        traceroute: { target: '', params: { maxHops: '30' }, output: '' }
      }
    }
  }

  const [state, setState] = useState(loadInitialState)
  const { connected, sendMessage, lastMessage } = useWebSocket('ws://localhost:8080/ws')

  // Save state to localStorage when it changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }, [state])

  const updateToolState = (tool, updates) => {
    setState(prevState => ({
      ...prevState,
      toolStates: {
        ...prevState.toolStates,
        [tool]: {
          ...prevState.toolStates[tool],
          ...updates
        }
      }
    }))
  }

  const handleToolSelect = (tool) => {
    setState(prevState => ({
      ...prevState,
      activeTool: tool
    }))
  }

  const toolComponents = {
    ping: Ping,
    dig: Dig,
    traceroute: Traceroute
  }
  
  const ActiveTool = toolComponents[state.activeTool]
  
  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar 
        activeTool={state.activeTool} 
        onToolSelect={handleToolSelect}
        connected={connected} 
      />
      <main className="flex-1 overflow-hidden">
        <div className="h-full flex flex-col">
          <header className="bg-white border-b border-gray-200 px-4 py-3">
            <h1 className="text-xl font-semibold text-gray-900">
              Network Tools - {state.activeTool.charAt(0).toUpperCase() + state.activeTool.slice(1)}
            </h1>
          </header>
          <div className="flex-1 overflow-auto p-4">
            <ActiveTool 
              onExecute={sendMessage}
              lastMessage={lastMessage}
              toolState={state.toolStates[state.activeTool]}
              onStateChange={(updates) => updateToolState(state.activeTool, updates)}
            />
          </div>
        </div>
      </main>
    </div>
  )
}