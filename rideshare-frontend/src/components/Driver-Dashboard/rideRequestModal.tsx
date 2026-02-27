
'use client';

import { useState, useEffect } from 'react';

interface RideRequest {
  id: string;
  riderName: string;
  riderRating: number;
  pickupAddress: string;
  dropoffAddress: string;
  estimatedFare: number;
  distance: number;
  duration: number;
  expiresAt: Date;
}

interface RideRequestModalProps {
  request: RideRequest;
  onAccept: (id: string) => void; 
  onDecline: () => void;
}

export default function RideRequestModal({ request, onAccept, onDecline }: RideRequestModalProps) {
  const [timeLeft, setTimeLeft] = useState(30);

  useEffect(() => {
    // Play notification sound
    const audio = new Audio('/notification.mp3');
    audio.play().catch(() => console.log('Audio play failed'));
    if (navigator.vibrate) {
      navigator.vibrate([200, 100, 200]);
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onDecline();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [onDecline]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full animate-pulse">
        <div className="text-center mb-4">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <span className="text-2xl">🚗</span>
          </div>
          <h2 className="text-xl font-bold text-gray-900">New Ride Request</h2>
          <p className="text-red-500 font-medium mt-1">Expires in {timeLeft}s</p>
        </div>

        {/* Rider Info */}
        <div className="bg-gray-50 rounded-lg p-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold">{request.riderName}</span>
            <div className="flex items-center">
              <span className="text-yellow-400 mr-1">★</span>
              <span className="text-sm font-medium">{request.riderRating}</span>
            </div>
          </div>
        </div>

        {/* Trip Details */}
        <div className="space-y-3 mb-6">
          <div className="flex items-start">
            <div className="w-2 h-2 bg-green-500 rounded-full mt-2 mr-3"></div>
            <div>
              <p className="text-sm font-medium">Pickup</p>
              <p className="text-sm text-gray-600">{request.pickupAddress}</p>
            </div>
          </div>
          <div className="flex items-start">
            <div className="w-2 h-2 bg-red-500 rounded-full mt-2 mr-3"></div>
            <div>
              <p className="text-sm font-medium">Dropoff</p>
              <p className="text-sm text-gray-600">{request.dropoffAddress}</p>
            </div>
          </div>
        </div>

        {/* Fare and Distance */}
        <div className="grid grid-cols-3 gap-4 mb-6 text-center">
          <div>
            <p className="text-2xl font-bold text-green-600">{formatCurrency(request.estimatedFare)}</p>
            <p className="text-xs text-gray-600">Fare</p>
          </div>
          <div>
            <p className="text-xl font-bold">{request.distance} km</p>
            <p className="text-xs text-gray-600">Distance</p>
          </div>
          <div>
            <p className="text-xl font-bold">{request.duration} min</p>
            <p className="text-xs text-gray-600">Duration</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={onDecline}
            className="bg-red-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-red-700 transition-colors"
          >
            Decline
          </button>

          <button
            onClick={() => onAccept(request.id)}   
            className="bg-green-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-green-700 transition-colors"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
