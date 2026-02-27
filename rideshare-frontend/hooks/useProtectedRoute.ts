'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';

export const useProtectedRoute = () => {
  const router = useRouter();
  const { isAuthenticated, _hasHydrated } = useAuthStore();

  useEffect(() => {
    if (!_hasHydrated) return; 

    if (!isAuthenticated) {
      console.log('[ProtectedRoute] Not authenticated → redirecting to login');
      router.replace('/auth/login');
    }
  }, [isAuthenticated, _hasHydrated, router]);

  return {
    isLoading: !_hasHydrated,
    isAuthenticated: _hasHydrated && isAuthenticated,
  };
};