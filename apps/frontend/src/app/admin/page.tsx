'use client';

import DashboardLayout from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, Users, Calendar, Building2, Settings, BarChart3 } from 'lucide-react';
import Link from 'next/link';

export default function AdminPage() {

  return (
    <DashboardLayout requireAuth={true} requireRole="admin">
      <div className="p-6">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Shield className="h-8 w-8 text-primary" />
            <div>
              <h2 className="text-3xl font-bold">Admin Panel</h2>
              <p className="text-muted-foreground">
                System administration and management dashboard
              </p>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">-</div>
              <p className="text-xs text-muted-foreground">All registered users</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Organizations</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">-</div>
              <p className="text-xs text-muted-foreground">Active organizations</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Events</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">-</div>
              <p className="text-xs text-muted-foreground">Total events created</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Requests</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">-</div>
              <p className="text-xs text-muted-foreground">Organizer requests</p>
            </CardContent>
          </Card>
        </div>

        {/* Admin Actions */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                User Management
              </CardTitle>
              <CardDescription>
                Manage users, roles, and permissions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button className="w-full" variant="outline">
                View All Users
              </Button>
              <Button className="w-full" variant="outline">
                Organizer Requests
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Organizations
              </CardTitle>
              <CardDescription>
                Manage organizations and memberships
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button className="w-full" variant="outline">
                View Organizations
              </Button>
              <Link href="/organizations/create">
                <Button className="w-full">
                  Create Organization
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Events
              </CardTitle>
              <CardDescription>
                Manage events and event permissions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link href="/events">
                <Button className="w-full" variant="outline">
                  View All Events
                </Button>
              </Link>
              <Link href="/events/create">
                <Button className="w-full">
                  Create Event
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                System Settings
              </CardTitle>
              <CardDescription>
                Configure system-wide settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button className="w-full" variant="outline">
                System Configuration
              </Button>
              <Button className="w-full" variant="outline">
                Email Settings
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Analytics
              </CardTitle>
              <CardDescription>
                View system analytics and reports
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button className="w-full" variant="outline">
                User Analytics
              </Button>
              <Button className="w-full" variant="outline">
                Event Reports
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Security
              </CardTitle>
              <CardDescription>
                Security and audit logs
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button className="w-full" variant="outline">
                Security Logs
              </Button>
              <Button className="w-full" variant="outline">
                Audit Trail
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Admin Privileges Notice */}
        <div className="mt-8">
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-primary">
                <Shield className="h-5 w-5" />
                Administrator Privileges
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="text-sm">As an administrator, you have full access to:</p>
                <ul className="text-sm space-y-1 ml-4">
                  <li>• Create and manage organizations</li>
                  <li>• Create and manage events for any organization</li>
                  <li>• View all events (public, private, and organization-specific)</li>
                  <li>• Approve or reject organizer role requests</li>
                  <li>• Access all system functionality and settings</li>
                  <li>• View system analytics and user activity</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
        </div>
      </DashboardLayout>
  );
}