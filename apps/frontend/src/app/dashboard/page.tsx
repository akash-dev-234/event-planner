'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useReduxAuth } from '@/hooks/useReduxAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Users, Settings, Plus, Eye, MessageSquare, BarChart3, Clock, UserPlus, Mail } from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import { useAppDispatch, useAppSelector } from '@/lib/redux/hooks';
import { fetchEvents } from '@/lib/redux/features/eventsSlice';
import { fetchOrganization } from '@/lib/redux/features/organizationSlice';

export default function DashboardPage() {
  const { user } = useReduxAuth();
  const dispatch = useAppDispatch();
  const { events } = useAppSelector((state) => state.events);
  const { currentOrganization } = useAppSelector((state) => state.organization);
  const [stats, setStats] = useState({
    myEvents: 0,
    upcomingEvents: 0,
    totalMembers: 0,
    recentActivity: 0
  });

  useEffect(() => {
    // Fetch user's events and organization data
    if (user?.role === 'organizer' || user?.role === 'admin') {
      dispatch(fetchEvents({ filter: 'my_org' }));
    }
    if (user?.organization_id) {
      dispatch(fetchOrganization(user.organization_id));
    }
  }, [dispatch, user]);

  useEffect(() => {
    // Calculate stats
    if (events) {
      const now = new Date();
      const myEvents = events.filter(event => event.can_edit);
      const upcomingEvents = myEvents.filter(event => new Date(event.date) > now);
      
      setStats({
        myEvents: myEvents.length,
        upcomingEvents: upcomingEvents.length,
        totalMembers: currentOrganization?.member_count || 0,
        recentActivity: myEvents.filter(event => 
          new Date(event.created_at || event.date) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        ).length
      });
    }
  }, [events, currentOrganization]);

  return (
    <DashboardLayout requireAuth={true}>
        <div className="p-6">
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">Dashboard</h2>
          <p className="text-muted-foreground">
            Welcome back, {user?.first_name}! {user?.role === 'organizer' ? 'Manage your events and organization.' : 'Explore events and organizations.'}
          </p>
        </div>

        {/* Stats Cards for Organizers */}
        {(user?.role === 'organizer' || user?.role === 'admin') && (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">My Events</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.myEvents}</div>
                <p className="text-xs text-muted-foreground">Events you manage</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Upcoming</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.upcomingEvents}</div>
                <p className="text-xs text-muted-foreground">Events coming up</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Team Members</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalMembers}</div>
                <p className="text-xs text-muted-foreground">In your organization</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Recent Activity</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.recentActivity}</div>
                <p className="text-xs text-muted-foreground">Events this week</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Main Action Cards */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Profile</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p><span className="font-medium">Name:</span> {user?.first_name} {user?.last_name}</p>
                <p><span className="font-medium">Email:</span> {user?.email}</p>
                <div className="flex items-center gap-2">
                  <span className="font-medium">Role:</span>
                  <Badge variant="secondary">
                    {user?.role}
                  </Badge>
                </div>
                {user?.organization_id && currentOrganization && (
                  <p><span className="font-medium">Organization:</span> {currentOrganization.name}</p>
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
              <div className="flex flex-col gap-4">
                <Link href="/events">
                  <Button className="w-full h-12" variant="outline">
                    <Eye className="h-4 w-4 mr-2" />
                    View All Events
                  </Button>
                </Link>
                {(user?.role === 'organizer' || user?.role === 'admin') && (
                  <Link href="/events/create">
                    <Button className="w-full h-12">
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
              <div className="flex flex-col gap-4">
                {user?.organization_id ? (
                  <>
                    <Link href={`/organizations/${user.organization_id}`}>
                      <Button className="w-full h-12" variant="outline">
                        <Users className="h-4 w-4 mr-2" />
                        View Organization
                      </Button>
                    </Link>
                    {user?.role === 'organizer' && (
                      <Link href="/organizations/invitations">
                        <Button className="w-full h-12" variant="outline">
                          <UserPlus className="h-4 w-4 mr-2" />
                          Invite Members
                        </Button>
                      </Link>
                    )}
                  </>
                ) : (
                  <>
                    <p className="text-sm text-muted-foreground">
                      You&apos;re not part of any organization yet.
                    </p>
                    {((user?.role === 'organizer' && !user?.organization_id) || user?.role === 'admin') && (
                      <Link href="/organizations/create">
                        <Button className="w-full h-12">
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
            <CardDescription>Common tasks and shortcuts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              <Link href="/events">
                <Button variant="outline" className="h-auto p-6 flex flex-col items-center gap-3 w-full hover:bg-accent/50 transition-colors">
                  <Calendar className="h-8 w-8" />
                  <span className="font-medium">Browse Events</span>
                </Button>
              </Link>
              <Link href="/invitations">
                <Button variant="outline" className="h-auto p-6 flex flex-col items-center gap-3 w-full hover:bg-accent/50 transition-colors">
                  <Mail className="h-8 w-8" />
                  <span className="font-medium">My Invitations</span>
                </Button>
              </Link>
              {(user?.role === 'organizer' || user?.role === 'admin') && (
                <Link href="/events/create">
                  <Button variant="outline" className="h-auto p-6 flex flex-col items-center gap-3 w-full hover:bg-primary/10 transition-colors border-primary/20">
                    <Plus className="h-8 w-8 text-primary" />
                    <span className="font-medium text-primary">Create Event</span>
                  </Button>
                </Link>
              )}
              {user?.organization_id && user?.role === 'organizer' && (
                <Link href="/organizations/invitations">
                  <Button variant="outline" className="h-auto p-6 flex flex-col items-center gap-3 w-full hover:bg-accent/50 transition-colors">
                    <UserPlus className="h-8 w-8" />
                    <span className="font-medium">Invite Members</span>
                  </Button>
                </Link>
              )}
              {user?.organization_id && (
                <Link href="/chat">
                  <Button variant="outline" className="h-auto p-6 flex flex-col items-center gap-3 w-full hover:bg-accent/50 transition-colors">
                    <MessageSquare className="h-8 w-8" />
                    <span className="font-medium">AI Assistant</span>
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