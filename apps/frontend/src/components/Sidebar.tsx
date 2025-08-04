'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useReduxAuth } from '@/hooks/useReduxAuth';
import { Button } from '@/components/ui/button';
import { 
  Home, 
  Calendar, 
  Building2, 
  Users, 
  Mail, 
  Settings, 
  MessageSquare,
  Shield,
  Plus,
  Eye,
  LogOut,
  UserCheck
} from 'lucide-react';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ isOpen = true, onClose }: SidebarProps) {
  const { user, logout } = useReduxAuth();
  const pathname = usePathname();

  const isActive = (path: string) => pathname === path || pathname.startsWith(path);

  const navigation = [
    {
      name: 'Dashboard',
      href: '/dashboard',
      icon: Home,
      show: true,
    },
    {
      name: 'Events',
      icon: Calendar,
      show: true,
      submenu: [
        {
          name: 'Browse Events',
          href: '/events',
          icon: Eye,
          show: true,
        },
        {
          name: 'Create Event',
          href: '/events/create',
          icon: Plus,
          show: user?.role === 'organizer' || user?.role === 'admin',
        },
      ],
    },
    {
      name: 'Organizations',
      icon: Building2,
      show: true,
      submenu: [
        {
          name: 'My Organization',
          href: user?.organization_id ? `/organizations/${user.organization_id}` : '#',
          icon: Building2,
          show: !!user?.organization_id,
        },
        {
          name: 'Create Organization',
          href: '/organizations/create',
          icon: Plus,
          show: (user?.role === 'organizer' && !user?.organization_id) || user?.role === 'admin',
        },
        {
          name: 'Members',
          href: user?.organization_id ? `/organizations/${user.organization_id}/members` : '#',
          icon: Users,
          show: user?.role === 'organizer' && !!user?.organization_id,
        },
      ],
    },
    {
      name: 'Invitations',
      href: '/invitations',
      icon: Mail,
      show: true,
    },
    {
      name: 'Chat Assistant',
      href: '/chat',
      icon: MessageSquare,
      show: !!user?.organization_id,
    },
    {
      name: 'Admin Panel',
      icon: Shield,
      show: user?.role === 'admin',
      submenu: [
        {
          name: 'Overview',
          href: '/admin',
          icon: Shield,
          show: user?.role === 'admin',
        },
        {
          name: 'Pending Requests',
          href: '/admin/organizer-requests',
          icon: UserCheck,
          show: user?.role === 'admin',
        },
      ],
    },
  ];

  const filteredNavigation = navigation.filter(item => item.show);

  return (
    <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border transform ${
      isOpen ? 'translate-x-0' : '-translate-x-full'
    } transition-transform duration-300 ease-in-out lg:translate-x-0 lg:fixed`}>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">EP</span>
            </div>
            <span className="font-semibold text-lg">Event Planner</span>
          </div>
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose} className="lg:hidden">
              ×
            </Button>
          )}
        </div>

        {/* User Info */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
              <span className="text-primary font-medium">
                {user?.first_name?.[0]}{user?.last_name?.[0]}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {user?.first_name} {user?.last_name}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {user?.email}
              </p>
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary mt-1">
                {user?.role}
              </span>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {filteredNavigation.map((item) => (
            <div key={item.name}>
              {item.href ? (
                <Link href={item.href}>
                  <Button
                    variant={isActive(item.href) ? "secondary" : "ghost"}
                    className="w-full justify-start gap-3"
                  >
                    <item.icon className="h-5 w-5" />
                    {item.name}
                  </Button>
                </Link>
              ) : (
                <div className="space-y-1">
                  <div className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-muted-foreground">
                    <item.icon className="h-5 w-5" />
                    {item.name}
                  </div>
                  {item.submenu && (
                    <div className="ml-6 space-y-1">
                      {item.submenu.filter(subitem => subitem.show).map((subitem) => (
                        subitem.href === '#' ? (
                          <Button
                            key={subitem.name}
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start gap-3 opacity-50 cursor-not-allowed"
                            disabled
                          >
                            <subitem.icon className="h-4 w-4" />
                            {subitem.name}
                          </Button>
                        ) : (
                          <Link key={subitem.name} href={subitem.href}>
                            <Button
                              variant={isActive(subitem.href) ? "secondary" : "ghost"}
                              size="sm"
                              className="w-full justify-start gap-3"
                            >
                              <subitem.icon className="h-4 w-4" />
                              {subitem.name}
                            </Button>
                          </Link>
                        )
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-border space-y-3">
          {/* Settings and Logout buttons */}
          <div className="space-y-2">
            <Link href="/settings">
              <Button
                variant={isActive('/settings') ? "secondary" : "ghost"}
                className="w-full justify-start gap-3"
                size="sm"
              >
                <Settings className="h-4 w-4" />
                Settings
              </Button>
            </Link>
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 text-red-600 hover:text-red-700 hover:bg-red-50"
              size="sm"
              onClick={logout}
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </Button>
          </div>
          
          <div className="text-xs text-muted-foreground text-center pt-2">
            Event Planner v1.0
          </div>
        </div>
      </div>
    </div>
  );
}