import { useState, useEffect } from 'preact/hooks'
import { Globe, History, XCircle } from 'lucide-react'
import CommandPanel from '../components/CommandPanel'
import OutputDisplay from '../components/OutputDisplay'

export default function Dig({ onExecute, lastMessage }) {
  const [output, setOutput] = useState('')
  const [isRunning, setIsRunning] = useState(false)
  const [queryHistory, setQueryHistory] = useState([])
  const [parsedRecords, setParsedRecords] = useState([])

  useEffect(() => {
    if (lastMessage?.tool === 'dig') {
      if (lastMessage.error) {
        setOutput(prev => prev + '\nError: ' + lastMessage.error)
        setIsRunning(false)
      } else if (lastMessage.output) {
        setOutput(prev => prev + '\n' + lastMessage.output)
        
        // Parse DNS records from output
        const lines = lastMessage.output.split('\n')
        const records = lines
          .filter(line => line.includes('IN'))
          .map(line => {
            const parts = line.trim().split(/\s+/)
            return {
              name: parts[0],
              ttl: parts[1],
              class: parts[2],
              type: parts[3],
              value: parts.slice(4).join(' ')
            }
          })
        
        if (records.length > 0) {
          setParsedRecords(records)
        }
      }
      
      if (lastMessage.endTime) {
        setIsRunning(false)
        // Save successful queries to history
        if (!lastMessage.error) {
          const newQuery = {
            target: lastMessage.target,
            type: lastMessage.parameters.type,
            timestamp: new Date().toISOString()
          }
          setQueryHistory(prev => [newQuery, ...prev].slice(0, 5))
        }
      }
    }
  }, [lastMessage])

  const handleExecute = (command) => {
    setOutput('')
    setIsRunning(true)
    setParsedRecords([])
    onExecute(command)
  }

  const handleHistoryClick = (query) => {
    onExecute({
      tool: 'dig',
      target: query.target,
      parameters: { type: query.type }
    })
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg p-4 shadow">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-medium text-gray-900">DNS Lookup (dig)</h2>
            <p className="text-sm text-gray-600 mt-1">
              Query DNS records for domain names and IP addresses.
            </p>
          </div>
          <Globe className="h-6 w-6 text-blue-500" />
        </div>

        <CommandPanel
          tool="dig"
          onExecute={handleExecute}
          isLoading={isRunning}
        />

        {queryHistory.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex items-center text-sm font-medium text-gray-700 mb-2">
              <History className="h-4 w-4 mr-1" />
              Recent Queries
            </div>
            <div className="grid gap-2">
              {queryHistory.map((query, index) => (
                <button
                  key={index}
                  onClick={() => handleHistoryClick(query)}
                  className="text-left px-3 py-2 bg-gray-50 rounded-md hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-900">{query.target}</span>
                    <span className="text-sm text-gray-500">{query.type}</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {new Date(query.timestamp).toLocaleString()}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {parsedRecords.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Parsed Records</h3>
            <div className="bg-gray-50 rounded-md p-2 space-y-2">
              {parsedRecords.map((record, index) => (
                <div key={index} className="text-sm bg-white p-2 rounded border border-gray-200">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-900">{record.name}</span>
                    <span className="text-gray-500">{record.type}</span>
                  </div>
                  <div className="text-gray-600 mt-1">{record.value}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    TTL: {record.ttl}
                  </div>
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