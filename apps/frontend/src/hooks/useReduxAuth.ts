'use client';

import { useAppDispatch, useAppSelector } from '@/lib/redux/hooks';
import { 
  loginUser, 
  registerUser, 
  forgotPassword as forgotPasswordThunk, 
  resetPassword as resetPasswordThunk,
  logout,
  clearError,
  initializeAuth
} from '@/lib/redux/features/authSlice';
import { LoginRequest, RegisterRequest } from '@/lib/api';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export function useReduxAuth() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { user, token, isLoading, error, isAuthenticated } = useAppSelector((state) => state.auth);

  useEffect(() => {
    // Initialize auth on app load
    dispatch(initializeAuth());
  }, [dispatch]);

  const login = async (credentials: LoginRequest) => {
    const result = await dispatch(loginUser(credentials));
    if (loginUser.rejected.match(result)) {
      throw new Error(result.payload as string);
    }
    return result.payload;
  };

  const register = async (userData: RegisterRequest) => {
    const result = await dispatch(registerUser(userData));
    if (registerUser.rejected.match(result)) {
      throw new Error(result.payload as string);
    }
    return result.payload;
  };

  const handleForgotPassword = async (email: string) => {
    const result = await dispatch(forgotPasswordThunk(email));
    if (forgotPasswordThunk.rejected.match(result)) {
      throw new Error(result.payload as string);
    }
    return result.payload;
  };

  const handleResetPassword = async (token: string, password: string) => {
    const result = await dispatch(resetPasswordThunk({ token, password }));
    if (resetPasswordThunk.rejected.match(result)) {
      throw new Error(result.payload as string);
    }
    return result.payload;
  };

  const handleLogout = () => {
    dispatch(logout());
    router.push('/login');
  };

  const handleClearError = () => {
    dispatch(clearError());
  };

  return {
    user,
    token,
    isLoading,
    error,
    isAuthenticated,
    login,
    register,
    forgotPassword: handleForgotPassword,
    resetPassword: handleResetPassword,
    logout: handleLogout,
    clearError: handleClearError,
  };
}