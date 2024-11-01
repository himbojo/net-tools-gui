import { Terminal, Wifi, Globe } from 'lucide-react'

export default function Sidebar({ activeTool, onToolSelect, connected }) {
  const tools = [
    { id: 'ping', name: 'Ping', icon: Wifi },
    { id: 'dig', name: 'DNS Lookup', icon: Globe },
    { id: 'traceroute', name: 'Traceroute', icon: Terminal }
  ]
  
  return (
    <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">Network Tools</h2>
        <div className="mt-2 flex items-center">
          <div className={`w-2 h-2 rounded-full mr-2 ${connected ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="text-sm text-gray-600">
            {connected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </div>
      <nav className="flex-1 px-2 py-4">
        {tools.map(({ id, name, icon: Icon }) => (
          <button
            key={id}
            onClick={() => onToolSelect(id)}
            className={`w-full flex items-center px-3 py-2 rounded-md mb-1 ${
              activeTool === id
                ? 'bg-blue-50 text-blue-700'
                : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Icon className="w-5 h-5 mr-3" />
            <span className="text-sm font-medium">{name}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}