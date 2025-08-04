'use client';

import { useEffect } from 'react';
import { useAppDispatch } from '@/lib/redux/hooks';
import { initializeAuth } from '@/lib/redux/features/authSlice';

export default function AuthInitializer({ children }: { children: React.ReactNode }) {
  const dispatch = useAppDispatch();

  useEffect(() => {
    // Always initialize auth on app start to ensure proper state restoration
    dispatch(initializeAuth());
  }, [dispatch]);


  return <>{children}</>;
}