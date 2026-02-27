'use client';
import { useState, useEffect } from 'react';
import { riderApi } from '@/utils/riderApi'; 
import { RiderTrip } from '@/types/rider';


export default function RideHistory() {
  const [rides, setRides] = useState<RiderTrip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRide, setSelectedRide] = useState<RiderTrip | null>(null);
  const [rating, setRating] = useState<number>(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [filter, setFilter] = useState<'all' | 'completed' | 'cancelled'>('all');
  const limit = 10;

  const fetchRides = async (pageNum: number, filterType: 'all' | 'completed' | 'cancelled' = 'all') => {
    try {
      setLoading(true);
      setError(null);

      const status = filterType === 'all' ? undefined : filterType;
      const includeCancelled = filterType === 'all' || filterType === 'cancelled';
      
      const response = await riderApi.getTrips({
        status,
        limit,
        offset: (pageNum - 1) * limit,
        includeCancelled: filterType === 'all' ? true : includeCancelled,
      });

      if (pageNum === 1) {
        setRides(response.trips);
      } else {
        setRides(prev => [...prev, ...response.trips]);
      }
      
      setHasMore(response.pagination.has_more);
    } catch (error: any) {
      console.error('Failed to fetch rides:', error);
      setError(error.message || 'Failed to load ride history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRides(1, filter);
  }, [filter]);

  const loadMore = () => {
    if (hasMore && !loading) {
      setPage(prev => {
        const nextPage = prev + 1;
        fetchRides(nextPage, filter);
        return nextPage;
      });
    }
  };

  const handleFilterChange = (newFilter: 'all' | 'completed' | 'cancelled') => {
    if (newFilter !== filter) {
      setFilter(newFilter);
      setPage(1);
      setRides([]);
    }
  };

  const handleRateRide = async (tripId: string) => {
    if (rating > 0) {
      try {
        setRides(prev => prev.map(ride => 
          ride.trip_id === tripId 
            ? { ...ride, driver_rating: rating } 
            : ride
        ));
        
        setRating(0);
        setSelectedRide(null);
      } catch (error) {
        console.error('Failed to submit rating:', error);
      }
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-NG', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatStatus = (status: RiderTrip['status']) => {
    const statusMap = {
      'pending': { text: 'Pending', className: 'bg-yellow-100 text-yellow-800' },
      'accepted': { text: 'Accepted', className: 'bg-blue-100 text-blue-800' },
      'arrived': { text: 'Driver Arrived', className: 'bg-purple-100 text-purple-800' },
      'started': { text: 'Trip Started', className: 'bg-indigo-100 text-indigo-800' },
      'completed': { text: 'Completed', className: 'bg-green-100 text-green-800' },
      'cancelled': { text: 'Cancelled', className: 'bg-red-100 text-red-800' },
    };
    
    return statusMap[status] || statusMap.completed;
  };

  const getPaymentStatusBadge = (status?: string) => {
    if (!status) return null;
    
    const statusMap = {
      'pending': { text: 'Payment Pending', className: 'bg-yellow-100 text-yellow-800' },
      'paid': { text: 'Paid', className: 'bg-green-100 text-green-800' },
      'failed': { text: 'Payment Failed', className: 'bg-red-100 text-red-800' },
    };
    
    const badge = statusMap[status as keyof typeof statusMap];
    if (!badge) return null;
    
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${badge.className}`}>
        {badge.text}
      </span>
    );
  };

  if (loading && rides.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Ride History</h2>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="border border-gray-200 rounded-lg p-4 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error && rides.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Ride History</h2>
        <div className="text-center py-8">
          <div className="text-red-500 mb-4">⚠️ {error}</div>
          <button
            onClick={() => fetchRides(1, filter)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Ride History</h2>
        <div className="flex space-x-2">
          <button
            onClick={() => handleFilterChange('all')}
            className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
              filter === 'all' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All Rides
          </button>
          <button
            onClick={() => handleFilterChange('completed')}
            className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
              filter === 'completed' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Completed
          </button>
          <button
            onClick={() => handleFilterChange('cancelled')}
            className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
              filter === 'cancelled' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Cancelled
          </button>
        </div>
      </div>

      {rides.length === 0 && !loading ? (
        <div className="text-center py-8 text-gray-500">
          No rides found. {filter !== 'all' && `Try changing the filter.`}
        </div>
      ) : (
        <div className="space-y-4">
          {rides.map((ride) => {
            const status = formatStatus(ride.status);
            const paymentBadge = getPaymentStatusBadge(ride.payment_status);
            
            return (
              <div
                key={ride.trip_id}
                className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${status.className}`}>
                        {status.text}
                      </span>
                      {paymentBadge}
                      <span className="text-sm text-gray-500">
                        {formatDate(ride.requested_at)}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                      <div>
                        <div className="text-sm text-gray-600">From</div>
                        <div className="font-medium">{ride.pickup_address}</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600">To</div>
                        <div className="font-medium">{ride.dropoff_address}</div>
                      </div>
                    </div>

                    {ride.driver_name && (
                      <div className="flex items-center space-x-4 mb-3">
                        <div className="text-sm text-gray-600">
                          Driver: <span className="font-medium">{ride.driver_name}</span>
                          {ride.driver_rating && (
                            <span className="ml-2">⭐ {ride.driver_rating.toFixed(1)}</span>
                          )}
                        </div>
                        {ride.vehicle_model && (
                          <div className="text-sm text-gray-600">
                            Vehicle: <span className="font-medium">{ride.vehicle_model}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {ride.distance_km && ride.duration_minutes && (
                      <div className="flex items-center space-x-4 text-sm text-gray-600 mb-3">
                        <span>Distance: {ride.distance_km} km</span>
                        <span>Duration: {ride.duration_minutes} min</span>
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gray-600">
                        Trip ID: <span className="font-mono text-xs">{ride.trip_id}</span>
                      </div>
                      <div className="text-lg font-bold text-gray-900">
                        ₦{(ride.actual_fare || ride.estimated_fare || 0).toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex space-x-2 mt-3">
                  {ride.status === 'completed' && (
                    <>
                      <button
                        onClick={() => setSelectedRide(ride)}
                        disabled={!!ride.driver_rating}
                        className={`text-sm px-3 py-1 rounded transition-colors ${
                          ride.driver_rating
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : 'bg-blue-600 hover:bg-blue-700 text-white'
                        }`}
                      >
                        {ride.driver_rating ? `Rated: ${ride.driver_rating}⭐` : 'Rate Ride'}
                      </button>
                      <button
                        onClick={() => console.log('View receipt for:', ride.trip_id)}
                        className="text-sm border border-gray-300 hover:border-gray-400 text-gray-700 px-3 py-1 rounded transition-colors"
                      >
                        View Receipt
                      </button>
                    </>
                  )}
                  {ride.status === 'cancelled' && (
                    <button
                      onClick={() => console.log('Report issue for:', ride.trip_id)}
                      className="text-sm border border-gray-300 hover:border-gray-400 text-gray-700 px-3 py-1 rounded transition-colors"
                    >
                      Report Issue
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {hasMore && rides.length > 0 && (
        <div className="text-center mt-6">
          <button
            onClick={loadMore}
            disabled={loading}
            className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Loading...' : 'Load More Rides'}
          </button>
        </div>
      )}

      {/* Rating Modal */}
      {selectedRide && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-4">Rate Your Ride</h3>
            <p className="text-gray-600 mb-4">
              How was your ride with {selectedRide.driver_name || 'the driver'}?
            </p>
            
            <div className="flex justify-center space-x-2 mb-6">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  className="text-3xl focus:outline-none transition-transform hover:scale-110"
                  aria-label={`Rate ${star} star${star !== 1 ? 's' : ''}`}
                >
                  {star <= rating ? '⭐' : '☆'}
                </button>
              ))}
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => handleRateRide(selectedRide.trip_id)}
                disabled={rating === 0}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white py-2 px-4 rounded transition-colors"
              >
                Submit Rating
              </button>
              <button
                onClick={() => {
                  setSelectedRide(null);
                  setRating(0);
                }}
                className="flex-1 border border-gray-300 hover:border-gray-400 text-gray-700 py-2 px-4 rounded transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}