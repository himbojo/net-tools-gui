// File: frontend/src/components/OutputDisplay.jsx

import { useRef, useEffect, useState } from 'preact/hooks'
import { Copy, Check, Terminal } from 'lucide-react'

export default function OutputDisplay({ output }) {
  const outputRef = useRef(null)
  const [copied, setCopied] = useState(false)
  
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight
    }
  }, [output])

  // Reset copied state after 2 seconds
  useEffect(() => {
    if (copied) {
      const timeout = setTimeout(() => setCopied(false), 2000)
      return () => clearTimeout(timeout)
    }
  }, [copied])

  const formatOutput = (output) => {
    if (!output) return []
    
    return output.split('\n').map((line, index) => {
      const isCommand = line.trim().startsWith('$ ')
      const isEmpty = line.trim() === ''
      return {
        text: line,
        isCommand,
        isEmpty
      }
    })
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(output)
      setCopied(true)
    } catch (err) {
      console.error('Failed to copy output:', err)
    }
  }

  if (!output) {
    return (
      <div className="bg-white rounded-lg shadow p-4 mt-4">
        <div className="flex items-center justify-center p-6 text-gray-500">
          <Terminal className="h-5 w-5 mr-2 opacity-50" />
          <p className="text-sm">
            Execute a command to see output here
          </p>
        </div>
      </div>
    )
  }
  
  const formattedOutput = formatOutput(output)
  
  return (
    <div className="bg-white rounded-lg shadow p-4 mt-4">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-sm font-medium text-gray-700 flex items-center">
          <Terminal className="h-4 w-4 mr-1" />
          Output
        </h3>
        <button
          onClick={handleCopy}
          className={`text-sm flex items-center px-2 py-1 rounded hover:bg-gray-100 
            transition-colors duration-200 ${
              copied ? 'text-green-600' : 'text-blue-600 hover:text-blue-700'
            }`}
        >
          {copied ? (
            <>
              <Check className="h-4 w-4 mr-1" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="h-4 w-4 mr-1" />
              Copy
            </>
          )}
        </button>
      </div>
      <div
        ref={outputRef}
        className="font-mono text-sm bg-gray-50 p-3 rounded-md max-h-96 overflow-auto"
      >
        <div className="space-y-1">
          {formattedOutput.map((line, index) => {
            if (line.isEmpty) {
              return <div key={index} className="h-2" /> // Spacer for empty lines
            }
            return (
              <div
                key={index}
                className={`${
                  line.isCommand 
                    ? 'text-blue-600 font-semibold bg-blue-50 border-l-2 border-blue-400 pl-2 -ml-2' 
                    : 'text-gray-700'
                } ${index === 0 ? '' : 'whitespace-pre-wrap break-all'}`}
              >
                {line.text}
              </div>
            )
          })}
        </div>
      </div>
      {formattedOutput.length > 10 && (
        <div className="mt-2 text-xs text-gray-500 text-right">
          {formattedOutput.length} lines
        </div>
      )}
    </div>
  )
}