'use client';

import { useProtectedRoute } from '@/hooks/useProtectedRoute';
import LoadingSpinner from '@/src/components/Authentication/LoadingSpinner';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isLoading, isAuthenticated } = useProtectedRoute();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center flex-col gap-4">
        <LoadingSpinner />
        <p className="text-gray-600">Loading your session...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Redirecting to login...</p>
      </div>
    );
  }

  return <>{children}</>;
}