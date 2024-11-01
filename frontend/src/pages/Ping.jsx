import { useState, useEffect } from 'preact/hooks'
import { Clock, Wifi } from 'lucide-react'
import CommandPanel from '../components/CommandPanel'
import OutputDisplay from '../components/OutputDisplay'

export default function Ping({ onExecute, lastMessage }) {
  const [output, setOutput] = useState('')
  const [isRunning, setIsRunning] = useState(false)
  const [stats, setStats] = useState({
    sent: 0,
    received: 0,
    avgTime: null
  })

  useEffect(() => {
    if (lastMessage?.tool === 'ping') {
      if (lastMessage.error) {
        setOutput(prev => prev + '\nError: ' + lastMessage.error)
        setIsRunning(false)
      } else if (lastMessage.output) {
        // Parse ping output for statistics
        const line = lastMessage.output.trim()
        setOutput(prev => prev + '\n' + line)
        
        // Update stats based on output
        if (line.includes('bytes from')) {
          const timeMatch = line.match(/time=([\d.]+)\s*ms/)
          if (timeMatch) {
            setStats(prev => ({
              sent: prev.sent + 1,
              received: prev.received + 1,
              avgTime: prev.avgTime === null 
                ? parseFloat(timeMatch[1])
                : (prev.avgTime + parseFloat(timeMatch[1])) / 2
            }))
          }
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
    setStats({ sent: 0, received: 0, avgTime: null })
    onExecute(command)
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg p-4 shadow">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-medium text-gray-900">ICMP Ping</h2>
            <p className="text-sm text-gray-600 mt-1">
              Send ICMP echo requests to test connectivity and measure response time.
            </p>
          </div>
          <Wifi className="h-6 w-6 text-blue-500" />
        </div>

        <CommandPanel
          tool="ping"
          onExecute={handleExecute}
          isLoading={isRunning}
        />

        {(isRunning || stats.sent > 0) && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-gray-50 p-3 rounded-md">
                <div className="text-sm font-medium text-gray-500">Packets Sent</div>
                <div className="mt-1 text-lg font-semibold text-gray-900">{stats.sent}</div>
              </div>
              <div className="bg-gray-50 p-3 rounded-md">
                <div className="text-sm font-medium text-gray-500">Packets Received</div>
                <div className="mt-1 text-lg font-semibold text-gray-900">{stats.received}</div>
              </div>
              <div className="bg-gray-50 p-3 rounded-md">
                <div className="text-sm font-medium text-gray-500">Avg Response Time</div>
                <div className="mt-1 text-lg font-semibold text-gray-900 flex items-center">
                  {stats.avgTime !== null ? (
                    <>
                      {stats.avgTime.toFixed(2)}
                      <span className="text-sm font-normal text-gray-500 ml-1">ms</span>
                    </>
                  ) : '-'}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      <OutputDisplay output={output} />
    </div>
  )
}