import { useState } from 'preact/hooks'
import Sidebar from './components/Sidebar'
import CommandPanel from './components/CommandPanel'
import OutputDisplay from './components/OutputDisplay'

export default function App() {
  const [activeTool, setActiveTool] = useState('ping')
  
  return (
    <div className="flex h-screen bg-gray-100">
      {/* TODO: Implement app layout */}
      <p>test</p>
    </div>
  )
}
