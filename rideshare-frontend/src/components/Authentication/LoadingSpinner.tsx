
import React from 'react'

interface LoadingSpinnerProps {
  showOverlay?: boolean 
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ showOverlay = false }) => {
  return (
    <div
      className={`flex items-center justify-center ${
        showOverlay ? 'absolute inset-0 bg-black bg-opacity-20 z-10' : ''
      }`}
    >
      <div className="w-6 h-6 border-4 border-t-4 border-gray-200 border-t-blue-500 rounded-full animate-spin"></div>
    </div>
  )
}

export default LoadingSpinner