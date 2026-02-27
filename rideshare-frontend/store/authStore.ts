'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';


export type UserType = 'rider' | 'driver';

export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  phone?: number;
  isVerified?: boolean;
  rating?: number;
  totalTrips?: number;
  displayName: string;
  userType: UserType;
  // Driver-specific fields
  licenseNumber?: string;
  vehicleType?: string;
  vehicleMake?: string;
  vehicleModel?: string;
  vehicleYear?: number;
  licensePlate?: string;
  isAvailable?: boolean;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  _hasHydrated: boolean;

  setAuth: (userData: any, token: string, userType?: UserType) => void;
  logout: () => void;
  updateUser: (updates: Partial<User>) => void;
  setHasHydrated: (value: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      _hasHydrated: false,

      setAuth: (rawUser: any, token: string, userType?: UserType) => {
        // Determine user type from the data or parameter
        let finalUserType: UserType = userType || 'rider';
        
        // Auto-detect user type from the data structure
        if (!userType) {
          if (rawUser.licenseNumber || rawUser.license_number || rawUser.vehicleType) {
            finalUserType = 'driver';
          } else if (rawUser.userType) {
            finalUserType = rawUser.userType;
          }
        }

        let displayName = 'User';
        if (rawUser?.name) {
          displayName = rawUser.name.trim();
        }
        else if (rawUser?.firstName || rawUser?.first_name || rawUser?.lastName || rawUser?.last_name) {
          const first = rawUser.firstName || rawUser.first_name || '';
          const last = rawUser.lastName || rawUser.last_name || '';
          displayName = `${first} ${last}`.trim() || 'User';
        }

        const normalizedUser: User = {
          id: rawUser.id || rawUser.riderId || rawUser.driverId || rawUser._id,
          email: rawUser.email,
          name: rawUser.name,
          firstName: rawUser.firstName || rawUser.first_name,
          lastName: rawUser.lastName || rawUser.last_name,
          phone: rawUser.phone || rawUser.phone_number,
          isVerified: rawUser.isVerified ?? rawUser.is_verified,
          rating: rawUser.rating,
          totalTrips: rawUser.totalTrips,
          displayName: displayName === 'User' ? rawUser.email?.split('@')[0] || 'User' : displayName,
          userType: finalUserType,
          
          // Driver-specific fields
          licenseNumber: rawUser.licenseNumber || rawUser.license_number,
          vehicleType: rawUser.vehicleType,
          vehicleMake: rawUser.vehicleMake,
          vehicleModel: rawUser.vehicleModel,
          vehicleYear: rawUser.vehicleYear,
          licensePlate: rawUser.licensePlate,
          isAvailable: rawUser.isAvailable ?? rawUser.is_available,
        };

        set({
          user: normalizedUser,
          token,
          isAuthenticated: true,
        });
      },

      logout: () =>
        set({
          user: null,
          token: null,
          isAuthenticated: false,
        }),

      updateUser: (updates) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...updates } : null,
        })),

      setHasHydrated: (value) => set({ _hasHydrated: value }),
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        console.log('[Auth] Hydration complete →', {
          hasToken: !!state?.token,
          isAuthenticated: state?.isAuthenticated,
          displayName: state?.user?.displayName,
          userType: state?.user?.userType,
        });
        state?.setHasHydrated(true);
      },
    }
  )
);

export const useAuth = () => {
  const store = useAuthStore();
  return {
    user: store.user,
    token: store.token,
    isAuthenticated: store.isAuthenticated,
    isLoading: !store._hasHydrated,
    isReady: store._hasHydrated,
    displayName: store.user?.displayName || 'User',
    userType: store.user?.userType || 'rider',
    isRider: store.user?.userType === 'rider',
    isDriver: store.user?.userType === 'driver',
    setAuth: store.setAuth,
    logout: store.logout,
    updateUser: store.updateUser,
  };
};