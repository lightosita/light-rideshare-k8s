'use client';

interface TripHeaderProps {
  title: string;
  subtitle: string;
  statusText: string;
  statusColor: string;
  statusBg: string;
  tripId: string;
  timeElapsed: number;
}

export default function TripHeader({ 
  title, 
  subtitle, 
  statusText, 
  statusColor, 
  statusBg, 
  tripId,
  timeElapsed 
}: TripHeaderProps) {
  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    }
    return `${minutes}m ${secs}s`;
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800">
            {title} 🚖
          </h1>
          <p className="text-gray-600 mt-2">{subtitle}</p>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-gray-500 text-sm">Trip ID: {tripId}</p>
            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
              Synced with backend
            </span>
          </div>
        </div>
        <div className="text-right">
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${statusBg} ${statusColor}`}>
            {statusText}
          </div>
          <div className="text-sm text-gray-500 mt-2">
            {timeElapsed > 0 ? `Started ${formatTime(timeElapsed)} ago` : 'Starting...'}
          </div>
        </div>
      </div>
    </div>
  );
}