'use client';
import { UserCircleIcon } from 'lucide-react';
import { useState } from 'react';
import { IoCarOutline } from 'react-icons/io5';
import UserRegisterForm from './UserRegisterForm';
import DriverRegisterForm from './DriverRegisterForm';



export default function RegisterPage() {

  const [activeTab, setActiveTab] = useState<'user' | 'driver'>('user');

  return (
    <div className="min-h-screen bg-linear-to-b from-gray-50 to-gray-100 flex flex-col md:flex-row">
      <div className="md:hidden bg-white shadow-sm p-4 flex items-center">
        <h1 className="text-xl font-semibold text-gray-800">Account Settings</h1>
      </div>
      
      <div className="md:hidden flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab('user')}
          className={`flex-1 py-3 text-center font-medium ${activeTab === 'user' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500'}`}
        >
          <span className="flex items-center justify-center">
            <UserCircleIcon className="h-5 w-5 mr-2" />
            User
          </span>
        </button>
        <button
          onClick={() => setActiveTab('driver')}
          className={`flex-1 py-3 text-center font-medium ${activeTab === 'driver' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500'}`}
        >
          <span className="flex items-center justify-center">
            <IoCarOutline  className="h-5 w-5 mr-2" />
            Driver
          </span>
        </button>
      </div>

      <div className="hidden md:block w-64 bg-white shadow-md">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800">Account Settings</h2>
        </div>
        <nav className="p-2">
          <button
            onClick={() => setActiveTab('user')}
            className={`w-full flex items-center p-3 rounded-lg mb-1 transition-colors ${activeTab === 'user' ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            <UserCircleIcon className="h-5 w-5 mr-3" />
            <span>User Account</span>
          </button>
          <button
            onClick={() => setActiveTab('driver')}
            className={`w-full flex items-center p-3 rounded-lg transition-colors ${activeTab === 'driver' ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            <IoCarOutline  className="h-5 w-5 mr-3" />
            <span>Driver Account</span>
          </button>
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-4 md:p-8">
          <div className="space-y-6">
            {activeTab === 'user' ? (
             
                <UserRegisterForm />
    
            ) : (
              <DriverRegisterForm />
            )}
          </div>
        
      </div>
    </div>
  );
}