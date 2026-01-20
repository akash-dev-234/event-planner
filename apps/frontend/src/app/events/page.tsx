'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAppDispatch, useAppSelector } from '@/lib/redux/hooks';
import { fetchEvents, setCurrentFilter } from '@/lib/redux/features/eventsSlice';
import { Calendar, Search, Filter, Plus, Eye, MapPin, Clock, Building2, User, Mail, UserPlus } from 'lucide-react';
import Link from 'next/link';
import { useReduxAuth } from '@/hooks/useReduxAuth';
import { useReduxToast } from '@/hooks/useReduxToast';
import { apiClient } from '@/lib/api';

export default function EventsPage() {
  const { user } = useReduxAuth();
  const dispatch = useAppDispatch();
  const { events, isLoading, error, currentFilter, totalCount } = useAppSelector((state) => state.events);
  const { success, error: errorToast } = useReduxToast();
  
  // Invite modal state
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [guestEmails, setGuestEmails] = useState('');
  const [isInviting, setIsInviting] = useState(false);

  useEffect(() => {
    dispatch(fetchEvents({ filter: currentFilter }));
  }, [dispatch, currentFilter]);

  const handleFilterChange = (filter: 'public' | 'my_org' | 'all') => {
    dispatch(setCurrentFilter(filter));
    dispatch(fetchEvents({ filter }));
  };

  const handleInviteGuests = (event: any) => {
    setSelectedEvent(event);
    setGuestEmails('');
    setInviteModalOpen(true);
  };

  const handleSendInvitations = async () => {
    if (!selectedEvent || !guestEmails.trim()) {
      errorToast('Error', 'Please enter at least one email address');
      return;
    }

    setIsInviting(true);
    try {
      // Parse emails from textarea (one per line or comma-separated)
      const emailList = guestEmails
        .split(/[,\n]/)
        .map(email => email.trim())
        .filter(email => email.length > 0)
        .map(email => ({ email, name: '' })); // Optional name field empty for now

      const response = await apiClient.inviteGuestsToEvent(selectedEvent.id, emailList);

      success(
        'Invitations Sent!', 
        `Successfully sent ${response.total_sent} invitation(s) to ${selectedEvent.title}`
      );
      
      setInviteModalOpen(false);
      setGuestEmails('');
      setSelectedEvent(null);
      
    } catch (error) {
      errorToast('Failed to Send Invitations', error as string || 'An error occurred while sending invitations');
    } finally {
      setIsInviting(false);
    }
  };

  return (
      <DashboardLayout requireAuth={true}>
      <div className="p-6">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold mb-2">Events</h2>
            <p className="text-muted-foreground">
              Discover and manage events in your organization and community
            </p>
          </div>
          {(user?.role === 'organizer' || user?.role === 'admin') && (
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
                      <div className="flex flex-wrap gap-2">
                        <Link href={`/events/${event.id}`}>
                          <Button size="sm" variant="outline">
                            View Details
                          </Button>
                        </Link>
                        {event.can_edit && (
                          <>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleInviteGuests(event)}
                              className="text-blue-600 border-blue-200 hover:bg-blue-50"
                            >
                              <UserPlus className="h-4 w-4 mr-1" />
                              Invite Guests
                            </Button>
                            <Link href={`/events/${event.id}/edit`}>
                              <Button size="sm">
                                Edit
                              </Button>
                            </Link>
                          </>
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

        {/* Invite Guests Modal */}
        <Dialog open={inviteModalOpen} onOpenChange={setInviteModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-blue-600" />
                Invite Guests to Event
              </DialogTitle>
              <DialogDescription>
                Send event invitations to guests via email. They'll receive a beautiful invitation with accept/decline options.
              </DialogDescription>
            </DialogHeader>
            
            {selectedEvent && (
              <div className="space-y-4">
                {/* Event Info */}
                <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                  <h4 className="font-medium text-blue-900">{selectedEvent.title}</h4>
                  <p className="text-sm text-blue-700">
                    {new Date(selectedEvent.date).toLocaleDateString()} at {selectedEvent.time} • {selectedEvent.location}
                  </p>
                </div>

                {/* Email Input */}
                <div className="space-y-2">
                  <Label htmlFor="guest-emails">Guest Email Addresses</Label>
                  <Textarea
                    id="guest-emails"
                    placeholder="Enter email addresses (one per line or comma-separated)&#10;example@email.com&#10;guest@domain.com, another@email.com"
                    value={guestEmails}
                    onChange={(e) => setGuestEmails(e.target.value)}
                    rows={4}
                    className="resize-none"
                  />
                  <p className="text-xs text-muted-foreground">
                    💡 Guests will receive a beautiful email invitation with event details and can accept/decline with one click.
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 pt-2">
                  <Button 
                    onClick={handleSendInvitations} 
                    disabled={isInviting || !guestEmails.trim()}
                    className="flex-1"
                  >
                    {isInviting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin mr-2"></div>
                        Sending...
                      </>
                    ) : (
                      <>
                        <Mail className="h-4 w-4 mr-2" />
                        Send Invitations
                      </>
                    )}
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setInviteModalOpen(false)}
                    disabled={isInviting}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
        </div>
      </DashboardLayout>
  );
}