import { useRef, useEffect } from 'preact/hooks'

export default function OutputDisplay({ output }) {
  const outputRef = useRef(null)
  
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight
    }
  }, [output])
  
  if (!output) {
    return (
      <div className="bg-white rounded-lg shadow p-4 mt-4">
        <p className="text-gray-500 text-sm">
          Execute a command to see output here
        </p>
      </div>
    )
  }
  
  return (
    <div className="bg-white rounded-lg shadow p-4 mt-4">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-sm font-medium text-gray-700">Output</h3>
        <button
          onClick={() => navigator.clipboard.writeText(output)}
          className="text-sm text-blue-600 hover:text-blue-700"
        >
          Copy
        </button>
      </div>
      <div
        ref={outputRef}
        className="font-mono text-sm bg-gray-50 p-3 rounded-md max-h-96 overflow-auto whitespace-pre"
      >
        {output}
      </div>
    </div>
  )
}