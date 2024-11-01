import { useState, useEffect } from 'preact/hooks'
import { Terminal, Map, Clock } from 'lucide-react'
import CommandPanel from '../components/CommandPanel'
import OutputDisplay from '../components/OutputDisplay'

export default function Traceroute({ onExecute, lastMessage }) {
  const [output, setOutput] = useState('')
  const [isRunning, setIsRunning] = useState(false)
  const [hopCount, setHopCount] = useState(0)
  const [hops, setHops] = useState([])
  const [startTime, setStartTime] = useState(null)

  useEffect(() => {
    if (lastMessage?.tool === 'traceroute') {
      if (lastMessage.error) {
        setOutput(prev => prev + '\nError: ' + lastMessage.error)
        setIsRunning(false)
      } else if (lastMessage.output) {
        const line = lastMessage.output.trim()
        setOutput(prev => prev + '\n' + line)
        
        // Parse hop information
        const hopMatch = line.match(/^\s*(\d+)\s+(\S+)\s+\(([\d.]+)\)\s+([\d.]+\s+ms|[*]+)/)
        if (hopMatch) {
          const [, hopNum, hostname, ip, latency] = hopMatch
          setHopCount(parseInt(hopNum))
          setHops(prev => [...prev, {
            hop: parseInt(hopNum),
            hostname,
            ip,
            latency: latency.includes('*') ? null : parseFloat(latency),
            timestamp: Date.now()
          }])
        }
      }
      
      if (lastMessage.endTime) {
        setIsRunning(false)
      }
    }
  }, [lastMessage])

  const handleExecute = (command) => {
    setOutput('')
    setIsRunning(true)
    setHopCount(0)
    setHops([])
    setStartTime(Date.now())
    onExecute(command)
  }

  const getElapsedTime = () => {
    if (!startTime || !isRunning) return null
    return ((Date.now() - startTime) / 1000).toFixed(1)
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg p-4 shadow">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-medium text-gray-900">Traceroute</h2>
            <p className="text-sm text-gray-600 mt-1">
              Trace network path and measure transit delays.
            </p>
          </div>
          <Map className="h-6 w-6 text-blue-500" />
        </div>

        <CommandPanel
          tool="traceroute"
          onExecute={handleExecute}
          isLoading={isRunning}
        />

        {(isRunning || hops.length > 0) && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-4">
                <div className="flex items-center">
                  <Terminal className="h-4 w-4 text-gray-500 mr-1" />
                  <span className="text-sm font-medium text-gray-700">
                    Hop {hopCount}
                  </span>
                </div>
                {startTime && (
                  <div className="flex items-center">
                    <Clock className="h-4 w-4 text-gray-500 mr-1" />
                    <span className="text-sm text-gray-700">
                      {getElapsedTime()}s
                    </span>
                  </div>
                )}
              </div>
              {isRunning && (
                <div className="text-sm text-gray-500">
                  Tracing route...
                </div>
              )}
            </div>

            <div className="relative">
              <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-gray-200">
                <div 
                  className="transition-all duration-300 ease-out bg-blue-500"
                  style={{ width: `${Math.min((hopCount / 30) * 100, 100)}%` }}
                />
              </div>
            </div>

            <div className="space-y-2">
              {hops.map((hop, index) => (
                <div 
                  key={index}
                  className="bg-gray-50 p-2 rounded-md flex items-center justify-between"
                >
                  <div className="flex items-center space-x-4">
                    <span className="text-sm font-medium text-gray-700 w-8">
                      {hop.hop}.
                    </span>
                    <span className="text-sm text-gray-900">
                      {hop.hostname}
                    </span>
                    <span className="text-sm text-gray-500">
                      ({hop.ip})
                    </span>
                  </div>
                  <span className="text-sm font-medium text-gray-900">
                    {hop.latency ? `${hop.latency.toFixed(1)} ms` : '*'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      <OutputDisplay output={output} />
    </div>
  )
}