// File: frontend/src/pages/Dig.jsx

import { useState, useEffect } from 'preact/hooks'
import { Globe, History, Clock, RefreshCw, Search } from 'lucide-react'
import CommandPanel from '../components/CommandPanel'
import OutputDisplay from '../components/OutputDisplay'

export default function Dig({ onExecute, lastMessage, toolState, onStateChange }) {
  const [isRunning, setIsRunning] = useState(false)
  const [queryHistory, setQueryHistory] = useState([])
  const [parsedRecords, setParsedRecords] = useState([])
  const [queryStartTime, setQueryStartTime] = useState(null)

  useEffect(() => {
    if (lastMessage?.tool === 'dig') {
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
        
        // Parse DNS records from output
        if (line.includes('IN')) {
          const recordMatch = line.match(/^(\S+)\s+(\d+)\s+IN\s+(\S+)\s+(.+)/)
          if (recordMatch) {
            const [, name, ttl, type, value] = recordMatch
            setParsedRecords(prev => [...prev, {
              name: name === '@' ? toolState.target : name,
              ttl: parseInt(ttl),
              type,
              value: value.trim(),
              timestamp: new Date()
            }])
          }
        }
      }
      
      if (lastMessage.endTime) {
        setIsRunning(false)
        // Save successful queries to history
        if (!lastMessage.error && parsedRecords.length > 0) {
          const newQuery = {
            target: lastMessage.target,
            type: lastMessage.parameters.type,
            timestamp: new Date(),
            recordCount: parsedRecords.length
          }
          setQueryHistory(prev => [newQuery, ...prev].slice(0, 5))
        }
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
    setParsedRecords([])
    setQueryStartTime(Date.now())
    onExecute(command)
  }

  const handleHistoryClick = (query) => {
    const command = {
      tool: 'dig',
      target: query.target,
      parameters: { type: query.type }
    }
    handleExecute(command)
  }

  // Format TTL with appropriate units
  const formatTTL = (seconds) => {
    if (seconds < 60) return `${seconds}s`
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`
    return `${Math.floor(seconds / 86400)}d`
  }

  // Get record type icon
  const getRecordTypeIcon = (type) => {
    switch (type) {
      case 'A':
        return '🌐'
      case 'AAAA':
        return '6️⃣'
      case 'MX':
        return '📧'
      case 'NS':
        return '🔄'
      case 'TXT':
        return '📝'
      case 'CNAME':
        return '➡️'
      case 'SOA':
        return '📋'
      default:
        return '📄'
    }
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg p-4 shadow">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-medium text-gray-900">DNS Lookup (dig)</h2>
            <p className="text-sm text-gray-600 mt-1">
              Query DNS records and analyze domain name information.
            </p>
          </div>
          <Globe 
            className={`h-6 w-6 ${
              isRunning 
                ? 'text-green-500 animate-spin'
                : parsedRecords.length > 0 
                  ? 'text-blue-500' 
                  : 'text-gray-400'
            }`}
          />
        </div>

        <CommandPanel
          tool="dig"
          onExecute={handleExecute}
          isLoading={isRunning}
          initialState={{
            target: toolState.target,
            params: toolState.params
          }}
        />

        {/* Query History */}
        {queryHistory.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <h3 className="text-sm font-medium text-gray-700 flex items-center mb-3">
              <History className="h-4 w-4 mr-1" />
              Recent Queries
            </h3>
            <div className="grid gap-2">
              {queryHistory.map((query, index) => (
                <button
                  key={index}
                  onClick={() => handleHistoryClick(query)}
                  className="text-left px-3 py-2 bg-gray-50 rounded-md hover:bg-gray-100 
                    transition-colors duration-200 focus:outline-none focus:ring-2 
                    focus:ring-blue-500 focus:ring-offset-2 group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <span className="font-medium text-gray-900">{query.target}</span>
                      <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-700">
                        {query.type}
                      </span>
                    </div>
                    <span className="text-sm text-gray-500">
                      {query.recordCount} records
                    </span>
                  </div>
                  <div className="flex items-center mt-1 text-xs text-gray-500">
                    <Clock className="h-3 w-3 mr-1" />
                    {new Date(query.timestamp).toLocaleString()}
                    <RefreshCw className="h-3 w-3 ml-2 mr-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <span className="opacity-0 group-hover:opacity-100 transition-opacity">
                      Click to rerun
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Parsed Records */}
        {parsedRecords.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-gray-700 flex items-center">
                <Search className="h-4 w-4 mr-1" />
                DNS Records
              </h3>
              <span className="text-xs text-gray-500">
                Query time: {((Date.now() - queryStartTime) / 1000).toFixed(2)}s
              </span>
            </div>
            <div className="bg-gray-50 rounded-md p-2 space-y-2">
              {parsedRecords.map((record, index) => (
                <div 
                  key={index} 
                  className="bg-white p-3 rounded-md border border-gray-200 hover:border-blue-300 
                    transition-colors duration-200"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-lg" role="img" aria-label={record.type}>
                        {getRecordTypeIcon(record.type)}
                      </span>
                      <span className="font-medium text-gray-900">{record.name}</span>
                      <span className="px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-700">
                        {record.type}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500 flex items-center">
                      <Clock className="h-3 w-3 mr-1" />
                      TTL: {formatTTL(record.ttl)}
                    </span>
                  </div>
                  <div className="mt-2 text-sm text-gray-600 font-mono break-all">
                    {record.value}
                  </div>
                  <div className="mt-1 text-xs text-gray-400">
                    {new Date(record.timestamp).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Running Indicator */}
        {isRunning && (
          <div className="mt-4 flex items-center justify-center">
            <div className="bg-blue-50 text-blue-700 px-3 py-2 rounded-full text-sm flex items-center">
              <Globe className="h-4 w-4 mr-2 animate-spin" />
              Querying DNS records for {toolState.target}...
            </div>
          </div>
        )}
      </div>

      <OutputDisplay output={toolState.output} />
    </div>
  )
}