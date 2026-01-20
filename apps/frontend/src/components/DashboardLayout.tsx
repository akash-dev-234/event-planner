'use client';

import React, { useState } from 'react';
import { useReduxAuth } from '@/hooks/useReduxAuth';
import { Button } from '@/components/ui/button';
import { LogOut, Menu } from 'lucide-react';
import Sidebar from './Sidebar';
import RouteGuard from './RouteGuard';
import ChatWidget from './ChatWidget';

interface DashboardLayoutProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  requireRole?: 'admin' | 'organizer' | 'team_member' | 'guest';
  requireOrganization?: boolean;
  allowedRoles?: ('admin' | 'organizer' | 'team_member' | 'guest')[];
}

export default function DashboardLayout({ 
  children, 
  requireAuth = true,
  requireRole,
  requireOrganization = false,
  allowedRoles = []
}: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { logout } = useReduxAuth();

  return (
    <RouteGuard 
      requireAuth={requireAuth}
      requireRole={requireRole}
      requireOrganization={requireOrganization}
      allowedRoles={allowedRoles}
    >
      <div className="flex min-h-screen bg-background">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden" 
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <Sidebar 
        isOpen={sidebarOpen} 
        onClose={() => setSidebarOpen(false)} 
      />

      {/* Main content wrapper */}
      <div className="flex-1 flex flex-col lg:ml-64">
        {/* Mobile header */}
        <header className="lg:hidden border-b border-border bg-card sticky top-0 z-30">
          <div className="flex items-center justify-between p-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-sm">EP</span>
              </div>
              <span className="font-semibold">Event Planner</span>
            </div>
            <Button variant="ghost" size="sm" onClick={logout}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1">
          {children}
        </main>
        </div>

        {/* Floating Chat Widget */}
        <ChatWidget />
      </div>
    </RouteGuard>
  );
}