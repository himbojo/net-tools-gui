import { useState } from 'preact/hooks'
import Sidebar from './components/Sidebar'
import CommandPanel from './components/CommandPanel'
import OutputDisplay from './components/OutputDisplay'

export default function App() {
  const [activeToolOutput, setActiveToolOutput] = useState('')
  const [isExecuting, setIsExecuting] = useState(false)
  
  return (
    <div className="flex h-screen bg-gray-100">
      {/* TODO: Implement main app layout and routing */}
    </div>
  )
}
