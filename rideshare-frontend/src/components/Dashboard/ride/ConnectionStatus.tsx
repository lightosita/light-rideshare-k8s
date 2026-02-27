interface ConnectionStatusProps {
  connectionStatus: 'disconnected' | 'connecting' | 'connected';
}

export default function ConnectionStatus({ connectionStatus }: ConnectionStatusProps) {
  const statusConfig = {
    connected: {
      bg: 'bg-green-100',
      text: 'text-green-800',
      label: '🟢 WebSocket Connected'
    },
    connecting: {
      bg: 'bg-yellow-100',
      text: 'text-yellow-800',
      label: '🟡 WebSocket Connecting...'
    },
    disconnected: {
      bg: 'bg-red-100',
      text: 'text-red-800',
      label: '🔴 WebSocket Disconnected'
    }
  };

  const config = statusConfig[connectionStatus];

  return (
    <div className="mb-4">
      <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${config.bg} ${config.text}`}>
        {config.label}
      </div>
    </div>
  );
}