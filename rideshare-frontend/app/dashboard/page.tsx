'use client';

import { useState } from 'react';
import RequestRide from '@/src/components/Dashboard/RequestRide';
import RideHistory from '@/src/components/Dashboard/RideHistory';
import Profile from '@/src/components/Dashboard/Profile';
import { FaCar, FaLocationArrow, FaHistory, FaUser } from 'react-icons/fa';

type View = 'home' | 'active-ride' | 'history' | 'profile';

export default function Dashboard() {
  const [activeView, setActiveView] = useState<View>('home');

  const navItems = [
    { id: 'home', name: 'Request Ride', icon: <FaCar /> },
    { id: 'history', name: 'Ride History', icon: <FaHistory /> },
    { id: 'profile', name: 'Profile', icon: <FaUser /> },
  ] as const;

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <aside className="w-64 bg-white shadow-sm border-r min-h-screen">
        <nav className="mt-8">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id)}
              className={`w-full flex items-center px-6 py-3 text-sm font-medium transition-colors ${
                activeView === item.id
                  ? 'bg-blue-50 border-r-4 border-blue-600 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <span className="mr-3 text-lg">{item.icon}</span>
              {item.name}
            </button>
          ))}
        </nav>
      </aside>

      <main className="flex-1 p-8">
        {activeView === 'home' && <RequestRide />}
        {activeView === 'history' && <RideHistory />}
        {activeView === 'profile' && <Profile />}
      </main>
    </div>
  );
}