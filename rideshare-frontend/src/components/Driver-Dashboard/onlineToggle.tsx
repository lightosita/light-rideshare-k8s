
'use client';

import { useState } from 'react';

interface OnlineToggleProps {
  isOnline: boolean;
  onToggle: (online: boolean) => void;
}

export default function OnlineToggle({ isOnline, onToggle }: OnlineToggleProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleToggle = async () => {
    setIsLoading(true);
    try {
      await onToggle(!isOnline);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center space-x-3">
      <span className={`text-sm font-medium ${isOnline ? 'text-green-600' : 'text-gray-600'}`}>
        {isOnline ? 'Online' : 'Offline'}
      </span>
      <button
        onClick={handleToggle}
        disabled={isLoading}
        className={`
          relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent 
          transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
          ${isOnline ? 'bg-green-600' : 'bg-gray-200'}
          ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <span
          className={`
            pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 
            transition duration-200 ease-in-out
            ${isOnline ? 'translate-x-5' : 'translate-x-0'}
          `}
        />
      </button>
    </div>
  );
}