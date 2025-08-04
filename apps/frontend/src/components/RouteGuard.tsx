'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useReduxAuth } from '@/hooks/useReduxAuth';

interface RouteGuardProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  requireRole?: 'admin' | 'organizer' | 'team_member' | 'guest';
  requireOrganization?: boolean;
  redirectTo?: string;
  allowedRoles?: ('admin' | 'organizer' | 'team_member' | 'guest')[];
}

export default function RouteGuard({
  children,
  requireAuth = true,
  requireRole,
  requireOrganization = false,
  redirectTo = '/login',
  allowedRoles = []
}: RouteGuardProps) {
  const { user, isAuthenticated, isLoading } = useReduxAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [hasInitialized, setHasInitialized] = useState(false);

  // Track when auth has been properly initialized
  useEffect(() => {
    if (!isLoading && !hasInitialized) {
      setHasInitialized(true);
    }
  }, [isLoading, hasInitialized]);

  useEffect(() => {
    const checkAuth = async () => {
      // Wait for auth to initialize completely
      if (isLoading || !hasInitialized) {
        return;
      }

      // Check authentication
      if (requireAuth && !isAuthenticated) {
        const loginUrl = redirectTo + (pathname !== '/dashboard' ? `?redirect=${pathname}` : '');
        router.push(loginUrl);
        return;
      }

      // Check specific role requirement
      if (requireRole && user?.role !== requireRole && user?.role !== 'admin') {
        router.push('/dashboard');
        return;
      }

      // Check allowed roles (more flexible than requireRole)
      if (allowedRoles.length > 0 && user?.role) {
        const hasAllowedRole = allowedRoles.includes(user.role) || user.role === 'admin';
        if (!hasAllowedRole) {
          router.push('/dashboard');
          return;
        }
      }

      // Check organization requirement for organizers
      if (requireOrganization && user?.role === 'organizer' && !user?.organization_id) {
        router.push('/organizations/create');
        return;
      }

      // If we get here, user is authorized
      setIsAuthorized(true);
      setIsChecking(false);
    };

    checkAuth();
  }, [isAuthenticated, user, isLoading, requireAuth, requireRole, requireOrganization, router, redirectTo, pathname, allowedRoles, hasInitialized]);

  // Show loading while checking auth
  if (isLoading || !hasInitialized || isChecking || (requireAuth && !isAuthorized)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Checking permissions...</p>
        </div>
      </div>
    );
  }

  // Render children if authorized
  return <>{children}</>;
}