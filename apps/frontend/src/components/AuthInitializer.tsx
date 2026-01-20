'use client';

import { useEffect, useState } from 'react';
import { useAppDispatch } from '@/lib/redux/hooks';
import { initializeAuth } from '@/lib/redux/features/authSlice';

export default function AuthInitializer({ children }: { children: React.ReactNode }) {
  const dispatch = useAppDispatch();
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // Always initialize auth on app start to ensure proper state restoration
    const initialize = async () => {
      try {
        await dispatch(initializeAuth()).unwrap();
      } catch (error) {
        // Auth initialization failed, but that's ok - user will need to login
        console.log('Auth initialization failed:', error);
      } finally {
        setIsInitialized(true);
      }
    };

    initialize();
  }, [dispatch]);

  // Show loading state while initializing auth
  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  return <>{children}</>;
}