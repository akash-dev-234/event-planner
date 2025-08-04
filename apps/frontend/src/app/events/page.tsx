'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAppDispatch, useAppSelector } from '@/lib/redux/hooks';
import { fetchEvents, setCurrentFilter } from '@/lib/redux/features/eventsSlice';
import { Calendar, Search, Filter, Plus, Eye, MapPin, Clock, Building2, User } from 'lucide-react';
import Link from 'next/link';
import { useReduxAuth } from '@/hooks/useReduxAuth';

export default function EventsPage() {
  const { user } = useReduxAuth();
  const dispatch = useAppDispatch();
  const { events, isLoading, error, currentFilter, totalCount } = useAppSelector((state) => state.events);

  useEffect(() => {
    dispatch(fetchEvents({ filter: currentFilter }));
  }, [dispatch, currentFilter]);

  const handleFilterChange = (filter: 'public' | 'my_org' | 'all') => {
    dispatch(setCurrentFilter(filter));
    dispatch(fetchEvents({ filter }));
  };

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold mb-2">Events</h2>
            <p className="text-muted-foreground">
              Discover and manage events in your organization and community
            </p>
          </div>
          {user?.role === 'organizer' && (
            <Link href="/events/create">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Event
              </Button>
            </Link>
          )}
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters
              {totalCount > 0 && (
                <span className="bg-primary text-primary-foreground text-xs px-2 py-1 rounded-full">
                  {totalCount}
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <Button 
                variant={currentFilter === 'public' ? 'default' : 'outline'} 
                size="sm"
                onClick={() => handleFilterChange('public')}
              >
                <Eye className="h-4 w-4 mr-2" />
                Public Events
              </Button>
              {user?.organization_id && (
                <Button 
                  variant={currentFilter === 'my_org' ? 'default' : 'outline'} 
                  size="sm"
                  onClick={() => handleFilterChange('my_org')}
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  Organization Events
                </Button>
              )}
              {user?.role === 'admin' && (
                <Button 
                  variant={currentFilter === 'all' ? 'default' : 'outline'} 
                  size="sm"
                  onClick={() => handleFilterChange('all')}
                >
                  <Search className="h-4 w-4 mr-2" />
                  All Events
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Events List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              {currentFilter === 'public' ? 'Public Events' : 
               currentFilter === 'my_org' ? 'Organization Events' : 'All Events'}
            </CardTitle>
            <CardDescription>
              {currentFilter === 'public' ? 'Events open to everyone' :
               currentFilter === 'my_org' ? 'Events in your organization' : 'All events in the system'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">
                <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading events...</p>
              </div>
            ) : events.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No events found</h3>
                <p className="text-muted-foreground mb-4">
                  {currentFilter === 'public' ? 'There are no public events available at the moment.' :
                   currentFilter === 'my_org' ? 'Your organization has no events yet.' : 'No events found.'}
                </p>
                {user?.role === 'organizer' && (
                  <Link href="/events/create">
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Your First Event
                    </Button>
                  </Link>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {events.map((event) => (
                  <div key={event.id} className="border rounded-lg p-4 hover:bg-accent/50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium mb-2">{event.title}</h4>
                        {event.description && (
                          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                            {event.description}
                          </p>
                        )}
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {new Date(event.date).toLocaleDateString()} at {event.time}
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {event.location}
                          </span>
                          <span className="flex items-center gap-1">
                            <Building2 className="h-3 w-3" />
                            {event.organization_name || 'Organization'}
                          </span>
                          {event.organizer && (
                            <span className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {event.organizer.name}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            event.is_public 
                              ? 'bg-green-100 text-green-700' 
                              : 'bg-blue-100 text-blue-700'
                          }`}>
                            {event.is_public ? 'Public' : 'Private'}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2">
                        <Link href={`/events/${event.id}`}>
                          <Button size="sm" variant="outline">
                            View Details
                          </Button>
                        </Link>
                        {event.can_edit && (
                          <Link href={`/events/${event.id}/edit`}>
                            <Button size="sm">
                              Edit
                            </Button>
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {error && (
              <div className="mt-4 p-3 rounded-md bg-red-50 border border-red-200">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Info Card */}
        <div className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>About Events</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <h4 className="font-medium mb-2">Public Events</h4>
                  <p className="text-sm text-muted-foreground">
                    Open to everyone, discoverable by all users on the platform
                  </p>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Organization Events</h4>
                  <p className="text-sm text-muted-foreground">
                    Private events visible only to members of your organization
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}