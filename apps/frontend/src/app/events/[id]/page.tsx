'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useReduxAuth } from '@/hooks/useReduxAuth';
import { useReduxToast } from '@/hooks/useReduxToast';
import { useAppDispatch, useAppSelector } from '@/lib/redux/hooks';
import { fetchEvent, deleteEvent } from '@/lib/redux/features/eventsSlice';
import DashboardLayout from '@/components/DashboardLayout';
import {
  Calendar,
  Clock,
  MapPin,
  Globe,
  Lock,
  ArrowLeft,
  Edit,
  Trash2,
  Share2,
  Building2,
  User,
  Users,
  Mail,
  CheckCircle2,
  XCircle,
  Clock as ClockPending
} from 'lucide-react';

export default function EventDetailsPage() {
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  
  const router = useRouter();
  const params = useParams();
  const dispatch = useAppDispatch();
  const { user } = useReduxAuth();
  const { success, error: errorToast } = useReduxToast();
  
  const { currentEvent, isLoading, error } = useAppSelector((state) => state.events);
  
  const eventId = parseInt(params.id as string);

  useEffect(() => {
    if (eventId && !isNaN(eventId)) {
      dispatch(fetchEvent(eventId));
    }
  }, [dispatch, eventId]);

  if (!user) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p>Please log in to view event details.</p>
        </div>
      </DashboardLayout>
    );
  }

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="h-64 bg-gray-200 rounded mb-6"></div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 h-32 bg-gray-200 rounded"></div>
              <div className="h-32 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !currentEvent) {
    return (
      <DashboardLayout>
        <div className="max-w-2xl mx-auto text-center py-12">
          <Card>
            <CardHeader>
              <CardTitle className="text-red-600">Event Not Found</CardTitle>
              <CardDescription>
                {error || 'The event you are looking for does not exist or you do not have permission to view it.'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => router.push('/events')}>
                Back to Events
              </Button>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  const handleDeleteEvent = async () => {
    setShowDeleteDialog(false);
    setIsDeleting(true);
    try {
      await dispatch(deleteEvent(currentEvent.id)).unwrap();
      success('Event Deleted', 'The event has been deleted successfully.');
      router.push('/events');
    } catch (error) {
      errorToast('Delete Failed', error as string || 'Failed to delete event.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleShareEvent = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({
          title: currentEvent.title,
          text: currentEvent.description || 'Check out this event!',
          url: url,
        });
        success('Shared!', 'Event shared successfully!');
      } else {
        await navigator.clipboard.writeText(url);
        success('Link Copied', 'Event link copied to clipboard!');
      }
    } catch (error) {
      // User cancelled or error occurred
      if ((error as Error).name !== 'AbortError') {
        errorToast('Share Failed', 'Could not share the event link');
      }
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (timeString: string) => {
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const canEdit = currentEvent.can_edit || (user.role === 'organizer' && currentEvent.organization_id === user.organization_id);

  return (
    <DashboardLayout>
      <div className="p-6 max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/events')}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Events
          </Button>
        </div>

        {/* Event Header */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  <Badge variant={currentEvent.is_public ? 'default' : 'secondary'}>
                    {currentEvent.is_public ? (
                      <><Globe className="h-3 w-3 mr-1" /> Public</>
                    ) : (
                      <><Lock className="h-3 w-3 mr-1" /> Private</>
                    )}
                  </Badge>
                </div>
                
                <CardTitle className="text-3xl">{currentEvent.title}</CardTitle>
                
                {currentEvent.description && (
                  <CardDescription className="text-base leading-relaxed">
                    {currentEvent.description}
                  </CardDescription>
                )}
              </div>
            </div>
          </CardHeader>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Event Details */}
            <Card>
              <CardHeader>
                <CardTitle>Event Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4">
                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <Calendar className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium">{formatDate(currentEvent.date)}</p>
                      <p className="text-sm text-muted-foreground">Event Date</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <Clock className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium">{formatTime(currentEvent.time)}</p>
                      <p className="text-sm text-muted-foreground">Event Time</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                    <MapPin className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <p className="font-medium">{currentEvent.location}</p>
                      <p className="text-sm text-muted-foreground">Location</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Organization Info */}
            {currentEvent.organization_name && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    Organized By
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                      <Building2 className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{currentEvent.organization_name}</p>
                      <p className="text-sm text-muted-foreground">Organization</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Guest List - Only visible to organizers and admins */}
            {canEdit && currentEvent.guest_counts && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Guest List
                  </CardTitle>
                  <CardDescription>
                    Invitations sent and responses for this event
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Summary Stats */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <CheckCircle2 className="h-4 w-4 text-emerald-700" />
                        <span className="text-xs font-medium text-emerald-700">Accepted</span>
                      </div>
                      <p className="text-2xl font-bold text-emerald-900">
                        {currentEvent.guest_counts.accepted}
                      </p>
                    </div>

                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <ClockPending className="h-4 w-4 text-amber-700" />
                        <span className="text-xs font-medium text-amber-700">Pending</span>
                      </div>
                      <p className="text-2xl font-bold text-amber-900">
                        {currentEvent.guest_counts.pending}
                      </p>
                    </div>

                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <XCircle className="h-4 w-4 text-red-700" />
                        <span className="text-xs font-medium text-red-700">Declined</span>
                      </div>
                      <p className="text-2xl font-bold text-red-900">
                        {currentEvent.guest_counts.declined}
                      </p>
                    </div>

                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <Mail className="h-4 w-4 text-slate-700" />
                        <span className="text-xs font-medium text-slate-700">Total</span>
                      </div>
                      <p className="text-2xl font-bold text-slate-900">
                        {currentEvent.guest_counts.total}
                      </p>
                    </div>
                  </div>

                  {/* Guest List Table */}
                  {currentEvent.guests && currentEvent.guests.length > 0 ? (
                    <div className="border rounded-lg overflow-hidden">
                      <div className="max-h-96 overflow-y-auto">
                        <table className="w-full">
                          <thead className="bg-muted sticky top-0">
                            <tr>
                              <th className="text-left p-2 text-xs font-medium">Guest</th>
                              <th className="text-left p-2 text-xs font-medium">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {currentEvent.guests.map((guest) => (
                              <tr key={guest.id} className="hover:bg-muted/50">
                                <td className="p-2">
                                  <div>
                                    <p className="text-sm font-medium">{guest.email}</p>
                                    {guest.name && (
                                      <p className="text-xs text-muted-foreground">{guest.name}</p>
                                    )}
                                  </div>
                                </td>
                                <td className="p-2">
                                  <span
                                    className={`text-xs px-2 py-1 rounded-full inline-flex items-center gap-1 ${
                                      guest.status === 'accepted'
                                        ? 'bg-emerald-100 text-emerald-700'
                                        : guest.status === 'declined'
                                        ? 'bg-red-100 text-red-700'
                                        : 'bg-amber-100 text-amber-700'
                                    }`}
                                  >
                                    {guest.status === 'accepted' && (
                                      <CheckCircle2 className="h-3 w-3" />
                                    )}
                                    {guest.status === 'declined' && <XCircle className="h-3 w-3" />}
                                    {guest.status === 'pending' && (
                                      <ClockPending className="h-3 w-3" />
                                    )}
                                    {guest.status.charAt(0).toUpperCase() + guest.status.slice(1)}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-6 border border-dashed rounded-lg">
                      <Mail className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">No guests invited yet</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Event Meta */}
            <Card>
              <CardHeader>
                <CardTitle>Event Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Event ID</span>
                  <span className="font-mono text-sm">#{currentEvent.id}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Visibility</span>
                  <Badge variant={currentEvent.is_public ? 'default' : 'secondary'}>
                    {currentEvent.is_public ? 'Public' : 'Private'}
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Created</span>
                  <span className="text-sm">
                    {new Date(currentEvent.created_at).toLocaleDateString()}
                  </span>
                </div>
                
                {currentEvent.updated_at !== currentEvent.created_at && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Updated</span>
                    <span className="text-sm">
                      {new Date(currentEvent.updated_at).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Organizer Info */}
            {currentEvent.organizer && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Event Organizer
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{currentEvent.organizer.name}</p>
                      <p className="text-sm text-muted-foreground">{currentEvent.organizer.email}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={handleShareEvent}
                >
                  <Share2 className="h-4 w-4 mr-2" />
                  Share Event
                </Button>
                
                {canEdit && (
                  <>
                    <Button 
                      variant="outline" 
                      className="w-full justify-start"
                      onClick={() => router.push(`/events/${currentEvent.id}/edit`)}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Event
                    </Button>
                    
                    <Button 
                      variant="outline" 
                      className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => setShowDeleteDialog(true)}
                      disabled={isDeleting}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      {isDeleting ? 'Deleting...' : 'Delete Event'}
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
        
        {/* Delete Confirmation Dialog */}
        <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-600">
                <Trash2 className="h-5 w-5" />
                Delete Event
              </DialogTitle>
              <DialogDescription>
                Are you sure you want to delete "{currentEvent?.title}"? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2">
              <Button 
                variant="outline" 
                onClick={() => setShowDeleteDialog(false)}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button 
                variant="destructive"
                onClick={handleDeleteEvent}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin mr-2"></div>
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Event
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}