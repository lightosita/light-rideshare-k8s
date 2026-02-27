'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from './Button';
import LoadingSpinner from './LoadingSpinner';
import { FcGoogle } from 'react-icons/fc';
import { useAuth } from '@/store/authStore';
import { setAuthToken } from '@/utils/driverApi'; 

type UserType = 'rider' | 'driver';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [userType, setUserType] = useState<UserType>('rider');
  const router = useRouter();
  const { setAuth } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const apiUrl =
        userType === 'rider'
          ? `${process.env.NEXT_PUBLIC_RIDER_SERVICE_URL}/api/v1/riders/auth/login`
          : `${process.env.NEXT_PUBLIC_DRIVER_SERVICE_URL}/api/v1/drivers/auth/login`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email,
          password: password,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || data.message || 'Login failed');
      }

      const userData =
        userType === 'rider' ? data.data?.rider : data.data?.driver;

      const tokenData = data.data?.token;

      if (userData && tokenData) {
        setAuth(userData, tokenData, userType);
        if (userType === 'driver') {
          setAuthToken(tokenData);
        }

        setEmail('');
        setPassword('');

        const dashboardPath =
          userType === 'rider' ? '/dashboard' : '/driver/dashboard';

        router.push(dashboardPath);
      } else {
        throw new Error(
          `Login successful but missing ${userType} data in response`
        );
      }
    } catch (err: any) {
      console.error('❌ Login error:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = () => {
   const url = `${process.env.NEXT_PUBLIC_RIDER_SERVICE_URL}/api/v1/riders/auth/google`;
    window.location.href = url;
  };

  const handleUserTypeToggle = (type: UserType) => {
    setUserType(type);
    setError('');
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Sign in to SwiftRide
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Or{' '}
          <Link
            href={
              userType === 'rider'
                ? '/auth/register'
                : '/driver/auth/register'
            }
            className="font-medium text-blue-600 hover:text-blue-500"
          >
            create an account
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="mb-6 bg-white rounded-lg shadow-sm p-1 flex">
          <button
            type="button"
            onClick={() => handleUserTypeToggle('rider')}
            className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
              userType === 'rider'
                ? 'bg-blue-600 text-white shadow'
                : 'text-gray-700 hover:text-gray-900'
            }`}
          >
            Rider
          </button>
          <button
            type="button"
            onClick={() => handleUserTypeToggle('driver')}
            className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
              userType === 'driver'
                ? 'bg-blue-600 text-white shadow'
                : 'text-gray-700 hover:text-gray-900'
            }`}
          >
            Driver
          </button>
        </div>

        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {error && (
            <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-md text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700"
              >
                Email address
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700"
              >
                Password
              </label>
              <div className="mt-1">
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="text-sm">
                <Link
                  href={
                    userType === 'rider'
                      ? '/auth/forgot-password'
                      : '/auth/driver/forgot-password'
                  }
                  className="font-medium text-blue-600 hover:text-blue-500"
                >
                  Forgot your password?
                </Link>
              </div>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              variant="primary"
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              {isLoading ? (
                <LoadingSpinner />
              ) : (
                `Sign in as ${userType === 'rider' ? 'Rider' : 'Driver'}`
              )}
            </Button>
          </form>

          {userType === 'rider' && (
            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">
                    Or continue with
                  </span>
                </div>
              </div>

              <div className="mt-6">
                <button
                  onClick={handleGoogleLogin}
                  className="w-full flex justify-center gap-3 py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  <FcGoogle className="h-5 w-5" />
                  Sign in with Google
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
