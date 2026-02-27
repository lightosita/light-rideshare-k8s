'use client';
import { useAuthStore } from '@/store/authStore';
import { useState } from 'react';


interface PaymentMethod {
  id: string;
  type: 'card' | 'wallet';
  lastFour?: string;
  name: string;
  isDefault: boolean;
}

export default function Profile() {
  const { user, updateUser } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'personal' | 'payment' | 'preferences' | 'ratings'>('personal');

  const [personalInfo, setPersonalInfo] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    phone: user?.phone || '',
  });

  const paymentMethods: PaymentMethod[] = [
    { id: '1', type: 'card', lastFour: '4242', name: 'Visa ending in 4242', isDefault: true },
    { id: '2', type: 'wallet', name: 'SmartRide Wallet', isDefault: false },
  ];

  const ridePreferences = {
    favoriteVehicleType: 'SEDAN' as const,
    musicPreference: 'None' as const,
    conversationPreference: 'None' as const,
    acPreference: 'Auto' as const,
  };

const handleSavePersonalInfo = () => {
  const updatedInfo = {
    ...personalInfo,
    phone: typeof personalInfo.phone === 'string' 
      ? parseInt(personalInfo.phone.replace(/\D/g, ''), 10) 
      : personalInfo.phone
  };
  
  updateUser(updatedInfo);
  alert('Profile updated successfully!');
};

  const tabs = [
    { id: 'personal', name: 'Personal Info', icon: '👤' },
    { id: 'payment', name: 'Payment Methods', icon: '💳' },
    { id: 'preferences', name: 'Ride Preferences', icon: '⚙️' },
    { id: 'ratings', name: 'Rating History', icon: '⭐' },
  ] as const;

  return (
    <div className="bg-white rounded-lg shadow-lg">
      <div className="border-b border-gray-200">
        <nav className="flex -mb-px">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-4 px-1 text-center border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      <div className="p-6">
        {/* Personal Information */}
        {activeTab === 'personal' && (
          <div className="max-w-2xl">
            <h3 className="text-lg font-semibold mb-4">Personal Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  First Name
                </label>
                <input
                  type="text"
                  value={personalInfo.firstName}
                  onChange={(e) => setPersonalInfo(prev => ({ ...prev, firstName: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Last Name
                </label>
                <input
                  type="text"
                  value={personalInfo.lastName}
                  onChange={(e) => setPersonalInfo(prev => ({ ...prev, lastName: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={personalInfo.email}
                  onChange={(e) => setPersonalInfo(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={personalInfo.phone}
                  onChange={(e) => setPersonalInfo(prev => ({ ...prev, phone: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <button
              onClick={handleSavePersonalInfo}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md font-medium transition-colors"
            >
              Save Changes
            </button>
          </div>
        )}

        {/* Payment Methods */}
        {activeTab === 'payment' && (
          <div>
            <h3 className="text-lg font-semibold mb-4">Payment Methods</h3>
            <div className="space-y-3 mb-6">
              {paymentMethods.map((method) => (
                <div
                  key={method.id}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      {method.type === 'card' ? '💳' : '💰'}
                    </div>
                    <div>
                      <div className="font-medium">{method.name}</div>
                      {method.isDefault && (
                        <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded-full">
                          Default
                        </span>
                      )}
                    </div>
                  </div>
                  <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                    {method.isDefault ? 'Edit' : 'Set as Default'}
                  </button>
                </div>
              ))}
            </div>
            <button className="border-2 border-dashed border-gray-300 hover:border-gray-400 text-gray-600 w-full py-4 rounded-lg font-medium transition-colors">
              + Add Payment Method
            </button>
          </div>
        )}

        {/* Ride Preferences */}
        {activeTab === 'preferences' && (
          <div className="max-w-2xl">
            <h3 className="text-lg font-semibold mb-4">Ride Preferences</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Preferred Vehicle Type
                </label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="SEDAN">Sedan</option>
                  <option value="SUV">SUV</option>
                  <option value="VAN">Van</option>
                  <option value="LUXURY">Luxury</option>
                  <option value="ELECTRIC">Electric</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Music Preference
                </label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="None">No preference</option>
                  <option value="Quiet">Quiet ride</option>
                  <option value="Light">Light music</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Conversation Preference
                </label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="None">No preference</option>
                  <option value="Quiet">Quiet ride</option>
                  <option value="Friendly">Friendly conversation</option>
                </select>
              </div>
            </div>

            <button className="mt-6 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md font-medium transition-colors">
              Save Preferences
            </button>
          </div>
        )}

        {/* Rating History */}
        {activeTab === 'ratings' && (
          <div>
            <h3 className="text-lg font-semibold mb-4">Your Ratings</h3>
            <div className="text-center py-12 text-gray-500">
              <div className="text-4xl mb-2">⭐</div>
              <p>No ratings yet</p>
              <p className="text-sm">Your ride ratings will appear here</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}