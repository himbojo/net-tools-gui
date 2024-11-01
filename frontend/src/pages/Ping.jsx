// File: frontend/src/pages/Ping.jsx

import { useState, useEffect } from 'preact/hooks'
import { Wifi, Activity, AlertTriangle } from 'lucide-react'
import CommandPanel from '../components/CommandPanel'
import OutputDisplay from '../components/OutputDisplay'

export default function Ping({ onExecute, lastMessage, toolState, onStateChange }) {
  const [isRunning, setIsRunning] = useState(false)
  const [stats, setStats] = useState({
    sent: 0,
    received: 0,
    avgTime: null,
    times: [],
    min: null,
    max: null,
    lastUpdate: null
  })

  useEffect(() => {
    if (lastMessage?.tool === 'ping') {
      if (lastMessage.error) {
        onStateChange({
          output: toolState.output + '\nError: ' + lastMessage.error
        })
        setIsRunning(false)
      } else if (lastMessage.output) {
        const line = lastMessage.output.trim()
        
        // Update output - handle first line (command) specially
        if (!toolState.output) {
          onStateChange({ output: line })
        } else {
          onStateChange({
            output: toolState.output + '\n' + line
          })
        }
        
        // Parse ping statistics
        if (line.includes('bytes from')) {
          const timeMatch = line.match(/time=([\d.]+)\s*ms/)
          if (timeMatch) {
            const time = parseFloat(timeMatch[1])
            setStats(prev => {
              const newTimes = [...prev.times, time]
              const newReceived = prev.received + 1
              return {
                sent: prev.sent + 1,
                received: newReceived,
                times: newTimes,
                avgTime: newTimes.reduce((a, b) => a + b, 0) / newReceived,
                min: Math.min(...newTimes),
                max: Math.max(...newTimes),
                lastUpdate: new Date()
              }
            })
          } else {
            setStats(prev => ({
              ...prev,
              sent: prev.sent + 1,
              lastUpdate: new Date()
            }))
          }
        } else if (line.match(/\d+\s+packets transmitted/)) {
          // Final statistics line
          setIsRunning(false)
        }
      }
      
      if (lastMessage.endTime) {
        setIsRunning(false)
      }
    }
  }, [lastMessage])

  const handleExecute = (command) => {
    // Reset state when starting new ping
    onStateChange({
      target: command.target,
      params: command.parameters,
      output: ''
    })
    setIsRunning(true)
    setStats({
      sent: 0,
      received: 0,
      avgTime: null,
      times: [],
      min: null,
      max: null,
      lastUpdate: null
    })
    onExecute(command)
  }

  // Calculate packet loss percentage
  const packetLoss = stats.sent > 0 
    ? ((stats.sent - stats.received) / stats.sent * 100).toFixed(1)
    : 0

  // Calculate jitter (standard deviation of response times)
  const calculateJitter = () => {
    if (stats.times.length < 2) return null
    const mean = stats.avgTime
    const squareDiffs = stats.times.map(time => Math.pow(time - mean, 2))
    const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / squareDiffs.length
    return Math.sqrt(avgSquareDiff)
  }

  const jitter = calculateJitter()

  // Calculate success rate color
  const getSuccessRateColor = () => {
    if (stats.received === 0) return 'text-gray-500'
    const rate = (stats.received / stats.sent) * 100
    if (rate >= 95) return 'text-green-600'
    if (rate >= 80) return 'text-yellow-600'
    return 'text-red-600'
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
          <Wifi 
            className={`h-6 w-6 ${
              isRunning 
                ? 'text-green-500 animate-pulse' 
                : stats.received > 0 
                  ? getSuccessRateColor()
                  : 'text-blue-500'
            }`}
          />
        </div>

        <CommandPanel
          tool="ping"
          onExecute={handleExecute}
          isLoading={isRunning}
          initialState={{
            target: toolState.target,
            params: toolState.params
          }}
        />

        {(isRunning || stats.sent > 0) && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            {/* Primary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="bg-gray-50 p-3 rounded-md">
                <div className="text-sm font-medium text-gray-500">Sent</div>
                <div className="mt-1 text-lg font-semibold text-gray-900">{stats.sent}</div>
              </div>
              <div className="bg-gray-50 p-3 rounded-md">
                <div className="text-sm font-medium text-gray-500">Received</div>
                <div className="mt-1 text-lg font-semibold text-gray-900">{stats.received}</div>
              </div>
              <div className="bg-gray-50 p-3 rounded-md">
                <div className="text-sm font-medium text-gray-500">Packet Loss</div>
                <div className={`mt-1 text-lg font-semibold flex items-center ${
                  parseFloat(packetLoss) > 0 ? 'text-red-600' : 'text-gray-900'
                }`}>
                  {packetLoss}%
                  {parseFloat(packetLoss) > 0 && (
                    <AlertTriangle className="h-4 w-4 ml-1" />
                  )}
                </div>
              </div>
              <div className="bg-gray-50 p-3 rounded-md">
                <div className="text-sm font-medium text-gray-500">Avg Time</div>
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

            {/* Secondary Stats */}
            {stats.times.length > 0 && (
              <>
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="bg-gray-50 p-3 rounded-md">
                    <div className="text-sm font-medium text-gray-500">Min Time</div>
                    <div className="mt-1 text-lg font-semibold text-gray-900">
                      {stats.min !== null ? `${stats.min.toFixed(2)} ms` : '-'}
                    </div>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-md">
                    <div className="text-sm font-medium text-gray-500">Max Time</div>
                    <div className="mt-1 text-lg font-semibold text-gray-900">
                      {stats.max !== null ? `${stats.max.toFixed(2)} ms` : '-'}
                    </div>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-md">
                    <div className="text-sm font-medium text-gray-500">Jitter</div>
                    <div className="mt-1 text-lg font-semibold text-gray-900">
                      {jitter !== null ? `${jitter.toFixed(2)} ms` : '-'}
                    </div>
                  </div>
                </div>

                {/* Response Time Graph */}
                <div className="mb-4">
                  <div className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                    <Activity className="h-4 w-4 mr-1" />
                    Response Time Graph
                  </div>
                  <div className="bg-gray-50 p-2 rounded-md h-32 flex items-end space-x-1">
                    {stats.times.map((time, index) => {
                      const maxHeight = 100 // maximum height in pixels
                      const maxTime = stats.max || time
                      const height = (time / maxTime) * maxHeight
                      return (
                        <div
                          key={index}
                          className="relative flex-1 group"
                        >
                          <div
                            className={`bg-blue-500 rounded-t transition-all duration-200 ${
                              index === stats.times.length - 1 ? 'bg-blue-600' : ''
                            }`}
                            style={{ height: `${height}px` }}
                          />
                          <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-full 
                            opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                            <div className="bg-gray-800 text-white text-xs rounded px-2 py-1 mt-2">
                              {time.toFixed(1)}ms
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>0 ms</span>
                    <span>{stats.max ? `${stats.max.toFixed(1)} ms` : ''}</span>
                  </div>
                </div>

                {/* Individual Response Times */}
                <div>
                  <div className="text-sm font-medium text-gray-700 mb-2">Response Times</div>
                  <div className="bg-gray-50 p-2 rounded-md">
                    <div className="flex flex-wrap gap-2">
                      {stats.times.map((time, index) => (
                        <div
                          key={index}
                          className={`px-2 py-1 text-sm rounded ${
                            index === stats.times.length - 1
                              ? 'bg-blue-100 text-blue-700 border border-blue-300'
                              : 'bg-white text-gray-700 border border-gray-200'
                          }`}
                        >
                          <span className="font-medium">#{index + 1}:</span> {time.toFixed(1)} ms
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Running Indicator */}
            {isRunning && (
              <div className="mt-4 flex items-center justify-center">
                <div className="bg-blue-50 text-blue-700 px-3 py-2 rounded-full text-sm flex items-center">
                  <Wifi className="h-4 w-4 mr-2 animate-pulse" />
                  Pinging {toolState.target}...
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <OutputDisplay output={toolState.output} />
    </div>
  )
}