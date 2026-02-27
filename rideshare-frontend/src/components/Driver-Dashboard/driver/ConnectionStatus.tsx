interface ConnectionStatusProps {
  isOnline: boolean;
  connectionStatus: 'disconnected' | 'connecting' | 'connected';
}

export default function ConnectionStatus({ isOnline, connectionStatus }: ConnectionStatusProps) {
  return (
    <div className="fixed top-4 right-4 z-50">
      <div className={`px-3 py-2 rounded-lg text-sm font-medium ${
        isOnline 
          ? connectionStatus === 'connected'
            ? 'bg-green-100 text-green-800'
            : 'bg-yellow-100 text-yellow-800'
          : 'bg-gray-100 text-gray-800'
      }`}>
        {isOnline 
          ? (connectionStatus === 'connected' ? '🟢 Online (WebSocket)' : '🟡 Connecting...')
          : '⚪ Offline'
        }
      </div>
    </div>
  );
}