'use client';

import Link from 'next/link';
import { useReduxAuth } from '@/hooks/useReduxAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Users, Settings, Plus, Eye, MessageSquare } from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';

export default function DashboardPage() {
  const { user } = useReduxAuth();

  return (
    <DashboardLayout requireAuth={true}>
        <div className="p-6">
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">Dashboard</h2>
          <p className="text-muted-foreground">
            Welcome back, {user?.first_name}! Manage your events and organizations.
          </p>
        </div>

        {/* User Info Card */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Profile</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p><span className="font-medium">Name:</span> {user?.first_name} {user?.last_name}</p>
                <p><span className="font-medium">Email:</span> {user?.email}</p>
                <p><span className="font-medium">Role:</span> 
                  <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
                    {user?.role}
                  </span>
                </p>
                {user?.organization_id && (
                  <p><span className="font-medium">Organization ID:</span> {user.organization_id}</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Events
              </CardTitle>
              <CardDescription>Manage your events</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Link href="/events">
                  <Button className="w-full" variant="outline">
                    <Eye className="h-4 w-4 mr-2" />
                    View All Events
                  </Button>
                </Link>
                {(user?.role === 'organizer' || user?.role === 'admin') && (
                  <Link href="/events/create">
                    <Button className="w-full">
                      <Plus className="h-4 w-4 mr-2" />
                      Create New Event
                    </Button>
                  </Link>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="h-5 w-5" />
                Organizations
              </CardTitle>
              <CardDescription>Manage your organization</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {user?.organization_id ? (
                  <>
                    <Link href={`/organizations/${user.organization_id}`}>
                      <Button className="w-full" variant="outline">
                        <Users className="h-4 w-4 mr-2" />
                        View Organization
                      </Button>
                    </Link>
                    {user?.role === 'organizer' && (
                      <Link href={`/organizations/${user.organization_id}/members`}>
                        <Button className="w-full" variant="outline">
                          <Settings className="h-4 w-4 mr-2" />
                          Manage Members
                        </Button>
                      </Link>
                    )}
                  </>
                ) : (
                  <>
                    <p className="text-sm text-muted-foreground mb-3">
                      You&apos;re not part of any organization yet.
                    </p>
                    {((user?.role === 'organizer' && !user?.organization_id) || user?.role === 'admin') && (
                      <Link href="/organizations/create">
                        <Button className="w-full">
                          <Plus className="h-4 w-4 mr-2" />
                          Create Organization
                        </Button>
                      </Link>
                    )}
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Quick Actions
            </CardTitle>
            <CardDescription>Common tasks and settings</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Link href="/events">
                <Button variant="outline" className="h-auto p-4 flex flex-col items-center gap-2 w-full">
                  <Calendar className="h-6 w-6" />
                  <span>Browse Events</span>
                </Button>
              </Link>
              <Link href="/invitations">
                <Button variant="outline" className="h-auto p-4 flex flex-col items-center gap-2 w-full">
                  <Users className="h-6 w-6" />
                  <span>My Invitations</span>
                </Button>
              </Link>
              {user?.organization_id && (
                <Link href="/chat">
                  <Button variant="outline" className="h-auto p-4 flex flex-col items-center gap-2 w-full">
                    <MessageSquare className="h-6 w-6" />
                    <span>AI Assistant</span>
                  </Button>
                </Link>
              )}
            </div>
          </CardContent>
        </Card>
        </div>
      </DashboardLayout>
  );
}