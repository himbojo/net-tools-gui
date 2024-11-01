import { useState, useEffect } from 'preact/hooks'
import { useRateLimit } from '../hooks/useRateLimit'
import { useInputValidation } from '../utils/validation'
import { AlertCircle, Loader2 } from 'lucide-react'

export default function CommandPanel({ tool, onExecute, isLoading, initialState = {} }) {
  const [target, setTarget] = useState(initialState.target || '')
  const [params, setParams] = useState(() => {
    // Initialize with either provided params or defaults
    return initialState.params || {
      ping: { count: '4' },
      dig: { type: 'A' },
      traceroute: { maxHops: '30' }
    }[tool]
  })
  
  const { isLimited, execute, remaining } = useRateLimit(10, 60000)
  const { validateInput, isValidating, error: validationError } = useInputValidation(tool)

  // Update target when initialState changes
  useEffect(() => {
    setTarget(initialState.target || '')
  }, [initialState.target])

  // Update params when initialState or tool changes
  useEffect(() => {
    setParams(initialState.params || {
      ping: { count: '4' },
      dig: { type: 'A' },
      traceroute: { maxHops: '30' }
    }[tool])
  }, [tool, initialState.params])

  const handleExecute = async () => {
    if (await validateInput(target, params)) {
      execute(() => {
        onExecute({
          tool,
          target,
          parameters: params
        })
      })
    }
  }

  const handleTargetChange = (e) => {
    const newTarget = e.target.value
    setTarget(newTarget)
  }

  const handleParamChange = (paramName, value) => {
    const newParams = { ...params, [paramName]: value }
    setParams(newParams)
  }

  const toolConfigs = {
    ping: (
      <div className="flex items-center space-x-4">
        <label className="flex items-center">
          <span className="text-sm text-gray-700 mr-2">Count:</span>
          <input
            type="number"
            min="1"
            max="10"
            className="w-20 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 disabled:opacity-50"
            value={params.count}
            onChange={(e) => handleParamChange('count', e.target.value)}
            disabled={isLoading || isValidating}
          />
        </label>
        <span className="text-xs text-gray-500">(1-10)</span>
      </div>
    ),
    
    dig: (
      <div className="flex items-center space-x-4">
        <label className="flex items-center">
          <span className="text-sm text-gray-700 mr-2">Record Type:</span>
          <select
            className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 disabled:opacity-50"
            value={params.type}
            onChange={(e) => handleParamChange('type', e.target.value)}
            disabled={isLoading || isValidating}
          >
            {['A', 'AAAA', 'MX', 'NS', 'TXT', 'SOA'].map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </label>
      </div>
    ),
    
    traceroute: (
      <div className="flex items-center space-x-4">
        <label className="flex items-center">
          <span className="text-sm text-gray-700 mr-2">Max Hops:</span>
          <input
            type="number"
            min="1"
            max="30"
            className="w-20 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 disabled:opacity-50"
            value={params.maxHops}
            onChange={(e) => handleParamChange('maxHops', e.target.value)}
            disabled={isLoading || isValidating}
          />
        </label>
        <span className="text-xs text-gray-500">(1-30)</span>
      </div>
    )
  }
  
  return (
    <div className="space-y-4">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Target Host
          </label>
          <div className="relative">
            <input
              type="text"
              placeholder="Enter hostname or IP address"
              className={`block w-full rounded-md shadow-sm 
                focus:ring-blue-500 focus:border-blue-500
                ${validationError ? 'border-red-300' : 'border-gray-300'}
                ${isValidating ? 'pr-10' : ''}
                disabled:opacity-50`}
              value={target}
              onChange={handleTargetChange}
              disabled={isLoading || isValidating}
            />
            {isValidating && (
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                <Loader2 className="h-4 w-4 text-gray-400 animate-spin" />
              </div>
            )}
          </div>
          {validationError && (
            <div className="mt-1 flex items-center text-sm text-red-600">
              <AlertCircle className="h-4 w-4 mr-1" />
              {validationError}
            </div>
          )}
        </div>
        
        <div>{toolConfigs[tool]}</div>
      </div>
      
      <div className="flex items-center justify-between pt-2">
        <button
          onClick={handleExecute}
          disabled={isLoading || isValidating || isLimited || !target}
          className="px-4 py-2 bg-blue-600 text-white rounded-md 
            hover:bg-blue-700 focus:outline-none focus:ring-2 
            focus:ring-blue-500 focus:ring-offset-2 
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-colors duration-200"
        >
          {isLoading ? (
            <span className="flex items-center">
              <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
              Running...
            </span>
          ) : (
            'Execute'
          )}
        </button>
        
        <div className="text-sm">
          {isLimited ? (
            <span className="text-red-600 flex items-center">
              <AlertCircle className="h-4 w-4 mr-1" />
              Rate limit reached
            </span>
          ) : (
            <span className="text-gray-500">
              {remaining} requests remaining
            </span>
          )}
        </div>
      </div>
    </div>
  )
}