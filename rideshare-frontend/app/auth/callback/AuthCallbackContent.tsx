'use client';
import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import LoadingSpinner from '@/src/components/Authentication/LoadingSpinner';
import { useAuthStore } from '@/store/authStore';

interface Rider {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  isVerified: boolean;
  rating: number;
  totalTrips: number;
}

export default function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setAuth = useAuthStore((state) => state.setAuth);

  useEffect(() => {
    const token = searchParams.get('token');
    const riderData = searchParams.get('rider');
    const error = searchParams.get('error');

    console.log('🔑 Auth Callback - Processing OAuth response:', { 
      hasToken: !!token, 
      hasRiderData: !!riderData,
      error 
    });

    if (error) {
      console.error('❌ OAuth error:', error);
      router.push(`/auth/login?error=${error}`);
      return;
    }

    if (token && riderData) {
      try {
        const rider = JSON.parse(decodeURIComponent(riderData));
        
        console.log('✅ OAuth successful, rider data:', {
          id: rider.id,
          email: rider.email,
          name: `${rider.firstName} ${rider.lastName}`
        });

        const userData = {
          id: rider.id,
          email: rider.email,
          first_name: rider.firstName,
          last_name: rider.lastName,
          role: 'rider', 
          phone_number: rider.phone
        };
        setAuth(userData, token);

        console.log('🔄 Zustand store updated, redirecting to dashboard...');
    
        setTimeout(() => {
          router.push('/dashboard');
        }, 100);
        
      } catch (err) {
        console.error('❌ Error parsing rider data:', err);
        router.push('/auth/login?error=invalid_auth_data');
      }
    } else {
      console.error('❌ Missing auth data in callback');
      router.push('/auth/login?error=missing_auth_data');
    }
  }, [router, searchParams, setAuth]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <LoadingSpinner />
        <p className="mt-4 text-gray-600">Completing authentication...</p>
      </div>
    </div>
  );
}