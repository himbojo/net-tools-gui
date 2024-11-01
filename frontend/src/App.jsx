import { useState } from 'preact/hooks'
import Sidebar from './components/Sidebar'
import Ping from './pages/Ping'
import Dig from './pages/Dig'
import Traceroute from './pages/Traceroute'
import { useWebSocket } from './hooks/useWebSocket'

export default function App() {
  const [activeTool, setActiveTool] = useState('ping')
  const { connected, sendMessage, lastMessage } = useWebSocket('ws://localhost:8080/ws')
  
  const toolComponents = {
    ping: Ping,
    dig: Dig,
    traceroute: Traceroute
  }
  
  const ActiveTool = toolComponents[activeTool]
  
  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar 
        activeTool={activeTool} 
        onToolSelect={setActiveTool}
        connected={connected} 
      />
      <main className="flex-1 overflow-hidden">
        <div className="h-full flex flex-col">
          <header className="bg-white border-b border-gray-200 px-4 py-3">
            <h1 className="text-xl font-semibold text-gray-900">
              Network Tools - {activeTool.charAt(0).toUpperCase() + activeTool.slice(1)}
            </h1>
          </header>
          <div className="flex-1 overflow-auto p-4">
            <ActiveTool 
              onExecute={sendMessage}
              lastMessage={lastMessage}
            />
          </div>
        </div>
      </main>
    </div>
  )
}