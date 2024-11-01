// File: frontend/src/pages/Traceroute.jsx

import { useState, useEffect } from 'preact/hooks'
import { Map, Network, Clock, Activity, AlertTriangle, Footprints } from 'lucide-react'
import CommandPanel from '../components/CommandPanel'
import OutputDisplay from '../components/OutputDisplay'

export default function Traceroute({ onExecute, lastMessage, toolState, onStateChange }) {
  const [isRunning, setIsRunning] = useState(false)
  const [hopCount, setHopCount] = useState(0)
  const [hops, setHops] = useState([])
  const [startTime, setStartTime] = useState(null)

  useEffect(() => {
    if (lastMessage?.tool === 'traceroute') {
      if (lastMessage.error) {
        onStateChange({
          output: toolState.output + '\nError: ' + lastMessage.error
        })
        setIsRunning(false)
      } else if (lastMessage.output) {
        const line = lastMessage.output.trim()
        
        // Handle first line (command) specially
        if (!toolState.output) {
          onStateChange({ output: line })
        } else {
          onStateChange({
            output: toolState.output + '\n' + line
          })
        }
        
        // Parse hop information
        const hopMatch = line.match(/^\s*(\d+)\s+(?:(\S+)\s+\(([\d.]+)\)|(\*))(?:\s+([\d.]+)\s+ms)?/)
        if (hopMatch) {
          const [, hopNum, hostname, ip, timeoutMark, latency] = hopMatch
          const hopNumber = parseInt(hopNum)
          setHopCount(hopNumber)
          
          const newHop = {
            number: hopNumber,
            hostname: hostname || (timeoutMark ? null : ''),
            ip: ip || null,
            latency: latency ? parseFloat(latency) : null,
            timeout: !!timeoutMark,
            timestamp: Date.now()
          }

          setHops(prev => {
            // Update existing hop or add new one
            const existing = prev.find(h => h.number === hopNumber)
            if (existing) {
              return prev.map(h => h.number === hopNumber ? newHop : h)
            }
            return [...prev, newHop]
          })
        }
      }
      
      if (lastMessage.endTime) {
        setIsRunning(false)
      }
    }
  }, [lastMessage])

  const handleExecute = (command) => {
    onStateChange({
      target: command.target,
      params: command.parameters,
      output: ''
    })
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

  // Calculate statistics
  const stats = {
    totalHops: hops.length,
    timeouts: hops.filter(hop => hop.timeout).length,
    averageLatency: hops
      .filter(hop => hop.latency !== null)
      .reduce((acc, hop, _, arr) => acc + hop.latency / arr.length, 0),
    maxLatency: Math.max(...hops.filter(hop => hop.latency !== null).map(hop => hop.latency))
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg p-4 shadow">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-medium text-gray-900">Traceroute</h2>
            <p className="text-sm text-gray-600 mt-1">
              Trace network path and analyze routing to destination.
            </p>
          </div>
          <Map 
            className={`h-6 w-6 ${
              isRunning 
                ? 'text-green-500 animate-pulse' 
                : hops.length > 0 
                  ? 'text-blue-500' 
                  : 'text-gray-400'
            }`}
          />
        </div>

        <CommandPanel
          tool="traceroute"
          onExecute={handleExecute}
          isLoading={isRunning}
          initialState={{
            target: toolState.target,
            params: toolState.params
          }}
        />

        {(isRunning || hops.length > 0) && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            {/* Progress Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="bg-gray-50 p-3 rounded-md">
                <div className="text-sm font-medium text-gray-500">Hops</div>
                <div className="mt-1 text-lg font-semibold text-gray-900">
                  {stats.totalHops}
                </div>
              </div>
              <div className="bg-gray-50 p-3 rounded-md">
                <div className="text-sm font-medium text-gray-500">Timeouts</div>
                <div className="mt-1 text-lg font-semibold text-gray-900 flex items-center">
                  {stats.timeouts}
                  {stats.timeouts > 0 && (
                    <AlertTriangle className="h-4 w-4 ml-1 text-yellow-500" />
                  )}
                </div>
              </div>
              <div className="bg-gray-50 p-3 rounded-md">
                <div className="text-sm font-medium text-gray-500">Avg Latency</div>
                <div className="mt-1 text-lg font-semibold text-gray-900">
                  {stats.averageLatency ? `${stats.averageLatency.toFixed(1)} ms` : '-'}
                </div>
              </div>
              <div className="bg-gray-50 p-3 rounded-md">
                <div className="text-sm font-medium text-gray-500">Max Latency</div>
                <div className="mt-1 text-lg font-semibold text-gray-900">
                  {stats.maxLatency ? `${stats.maxLatency.toFixed(1)} ms` : '-'}
                </div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mb-4">
              <div className="flex items-center justify-between text-sm mb-2">
                <div className="font-medium text-gray-700 flex items-center">
                  <Footprints className="h-4 w-4 mr-1" />
                  Route Progress
                </div>
                {startTime && (
                  <div className="text-gray-500 flex items-center">
                    <Clock className="h-4 w-4 mr-1" />
                    {getElapsedTime()}s
                  </div>
                )}
              </div>
              <div className="relative">
                <div className="overflow-hidden h-2 text-xs flex rounded bg-gray-200">
                  <div 
                    className="transition-all duration-300 ease-out bg-blue-500"
                    style={{ width: `${Math.min((hopCount / 30) * 100, 100)}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Hop Visualization */}
            <div className="mb-4">
              <h3 className="text-sm font-medium text-gray-700 flex items-center mb-2">
                <Network className="h-4 w-4 mr-1" />
                Network Path
              </h3>
              <div className="space-y-2">
                {hops.map((hop, index) => (
                  <div 
                    key={index}
                    className={`relative flex items-center bg-gray-50 p-3 rounded-md
                      ${hop.timeout ? 'border border-yellow-300 bg-yellow-50' : ''}
                      ${index === hops.length - 1 ? 'border border-green-300 bg-green-50' : ''}`}
                  >
                    {/* Hop Number */}
                    <div className="w-8 font-medium text-gray-900">
                      {hop.number}.
                    </div>

                    {/* Host Info */}
                    <div className="flex-1">
                      {hop.timeout ? (
                        <div className="text-yellow-600 flex items-center">
                          <AlertTriangle className="h-4 w-4 mr-1" />
                          Request timeout
                        </div>
                      ) : (
                        <>
                          <div className="font-medium text-gray-900">
                            {hop.hostname || hop.ip}
                          </div>
                          {hop.hostname && hop.ip && (
                            <div className="text-sm text-gray-500">
                              {hop.ip}
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    {/* Latency */}
                    {hop.latency !== null && (
                      <div className="ml-4 text-right">
                        <div className="font-medium text-gray-900">
                          {hop.latency.toFixed(1)} ms
                        </div>
                      </div>
                    )}

                    {/* Connection Line */}
                    {index < hops.length - 1 && (
                      <div className="absolute bottom-0 left-4 w-0.5 h-2 bg-gray-300" 
                        style={{ transform: 'translateY(100%)' }} 
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Latency Graph */}
            {hops.some(hop => hop.latency !== null) && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 flex items-center mb-2">
                  <Activity className="h-4 w-4 mr-1" />
                  Latency Distribution
                </h3>
                <div className="bg-gray-50 p-2 rounded-md h-32">
                  <div className="h-full flex items-end space-x-1">
                    {hops.map((hop, index) => {
                      if (hop.latency === null) return (
                        <div key={index} className="flex-1 bg-yellow-200 h-4 rounded-t" />
                      )
                      const height = (hop.latency / stats.maxLatency) * 100
                      return (
                        <div
                          key={index}
                          className="relative flex-1 group"
                        >
                          <div
                            className={`bg-blue-500 rounded-t transition-all duration-200 ${
                              index === hops.length - 1 ? 'bg-blue-600' : ''
                            }`}
                            style={{ height: `${height}%` }}
                          />
                          <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-full 
                            opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                            <div className="bg-gray-800 text-white text-xs rounded px-2 py-1 mt-2">
                              Hop {hop.number}: {hop.latency.toFixed(1)}ms
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>0 ms</span>
                  <span>{stats.maxLatency ? `${stats.maxLatency.toFixed(1)} ms` : ''}</span>
                </div>
              </div>
            )}

            {/* Running Indicator */}
            {isRunning && (
              <div className="mt-4 flex items-center justify-center">
                <div className="bg-blue-50 text-blue-700 px-3 py-2 rounded-full text-sm flex items-center">
                  <Map className="h-4 w-4 mr-2 animate-pulse" />
                  Tracing route to {toolState.target}... (hop {hopCount})
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