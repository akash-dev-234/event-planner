'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useReduxToast } from '@/hooks/useReduxToast';
import { useAppDispatch, useAppSelector } from '@/lib/redux/hooks';
import { fetchEvent, updateEvent, clearError } from '@/lib/redux/features/eventsSlice';
import { createEventSchema, CreateEventFormData } from '@/lib/validations/auth';
import { Calendar, ArrowLeft, MapPin, Clock, Globe, Lock, Save, Tag } from 'lucide-react';
import Link from 'next/link';
import DashboardLayout from '@/components/DashboardLayout';
import { useReduxAuth } from '@/hooks/useReduxAuth';
import { EventCategory } from '@/lib/api';

const CATEGORY_OPTIONS: { value: EventCategory; label: string }[] = [
  { value: 'conference', label: 'Conference' },
  { value: 'meetup', label: 'Meetup' },
  { value: 'workshop', label: 'Workshop' },
  { value: 'social', label: 'Social' },
  { value: 'networking', label: 'Networking' },
  { value: 'webinar', label: 'Webinar' },
  { value: 'other', label: 'Other' },
];

export default function EditEventPage() {
  const { success, error: errorToast } = useReduxToast();
  const router = useRouter();
  const params = useParams();
  const dispatch = useAppDispatch();
  const { user } = useReduxAuth();
  const { currentEvent, isLoading, error } = useAppSelector((state) => state.events);
  const [selectedCategory, setSelectedCategory] = useState<EventCategory>('other');
  const [isUpdating, setIsUpdating] = useState(false);

  const eventId = parseInt(params.id as string);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
    reset,
  } = useForm<CreateEventFormData>({
    resolver: zodResolver(createEventSchema),
    defaultValues: {
      title: '',
      description: '',
      date: '',
      time: '',
      location: '',
      is_public: false,
    },
  });

  // Watch is_public for visual feedback if needed
  watch('is_public');

  // Clear any stale errors on mount
  useEffect(() => {
    dispatch(clearError());
  }, [dispatch]);

  // Fetch event data and populate form
  useEffect(() => {
    if (eventId && !isNaN(eventId)) {
      dispatch(fetchEvent(eventId));
    }
  }, [dispatch, eventId]);

  // Populate form when event data is loaded
  useEffect(() => {
    if (currentEvent && currentEvent.id === eventId) {
      reset({
        title: currentEvent.title,
        description: currentEvent.description || '',
        date: currentEvent.date,
        time: currentEvent.time,
        location: currentEvent.location,
        is_public: currentEvent.is_public,
      });
      setSelectedCategory(currentEvent.category || 'other');
    }
  }, [currentEvent, eventId, reset]);

  // Check if user can edit this event
  const canEdit = currentEvent?.can_edit || 
    (user?.role === 'organizer' && currentEvent?.organization_id === user?.organization_id) ||
    user?.role === 'admin';

  const onSubmit = async (data: CreateEventFormData) => {
    if (!currentEvent) return;

    setIsUpdating(true);
    try {
      const result = await dispatch(updateEvent({
        eventId: currentEvent.id,
        data: {
          title: data.title,
          description: data.description || undefined,
          date: data.date,
          time: data.time,
          location: data.location,
          is_public: data.is_public,
          category: selectedCategory,
        }
      })).unwrap();

      success('Event Updated', `${result.title} has been updated successfully!`);
      router.push(`/events/${currentEvent.id}`);
    } catch (err) {
      const message = typeof err === 'string' ? err : 'Failed to update event';
      errorToast('Update Failed', message);
    } finally {
      setIsUpdating(false);
    }
  };

  // Get today's date in YYYY-MM-DD format
  const today = new Date().toISOString().split('T')[0];

  if (isLoading) {
    return (
      <DashboardLayout requireAuth={true}>
        <div className="p-6">
          <div className="max-w-4xl mx-auto">
            <div className="text-center py-12">
              <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading event details...</p>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!currentEvent || currentEvent.id !== eventId) {
    return (
      <DashboardLayout requireAuth={true}>
        <div className="p-6">
          <div className="max-w-4xl mx-auto">
            <div className="text-center py-12">
              <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Event not found</h3>
              <p className="text-muted-foreground mb-4">
                The event you're looking for doesn't exist or has been deleted.
              </p>
              <Link href="/events">
                <Button>Back to Events</Button>
              </Link>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!canEdit) {
    return (
      <DashboardLayout requireAuth={true}>
        <div className="p-6">
          <div className="max-w-4xl mx-auto">
            <div className="text-center py-12">
              <Lock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Access Denied</h3>
              <p className="text-muted-foreground mb-4">
                You don't have permission to edit this event.
              </p>
              <Link href={`/events/${eventId}`}>
                <Button>View Event</Button>
              </Link>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout requireAuth={true}>
      <div className="p-6">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <div className="flex items-center gap-4 mb-4">
              <Link href={`/events/${eventId}`}>
                <Button variant="ghost" size="sm" className="gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Back to Event
                </Button>
              </Link>
            </div>
            <div className="flex items-center gap-3 mb-4">
              <Calendar className="h-8 w-8 text-primary" />
              <div>
                <h2 className="text-3xl font-bold">Edit Event</h2>
                <p className="text-muted-foreground">
                  Update your event details and settings
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Event Details
                </CardTitle>
                <CardDescription>
                  Update the basic information about your event
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Title */}
                <div className="space-y-2">
                  <Label htmlFor="title">Event Title</Label>
                  <Input
                    id="title"
                    placeholder="Enter event title"
                    {...register('title')}
                    className={errors.title ? 'border-red-500' : ''}
                  />
                  {errors.title && (
                    <p className="text-sm text-red-500">{errors.title.message}</p>
                  )}
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <textarea
                    id="description"
                    placeholder="Enter event description (optional)"
                    rows={4}
                    {...register('description')}
                    className={`flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none ${
                      errors.description ? 'border-red-500' : ''
                    }`}
                  />
                  {errors.description && (
                    <p className="text-sm text-red-500">{errors.description.message}</p>
                  )}
                </div>

                {/* Date and Time */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="date" className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Date
                    </Label>
                    <Input
                      id="date"
                      type="date"
                      min={today}
                      {...register('date')}
                      className={errors.date ? 'border-red-500' : ''}
                    />
                    {errors.date && (
                      <p className="text-sm text-red-500">{errors.date.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="time" className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Time
                    </Label>
                    <Input
                      id="time"
                      type="time"
                      {...register('time')}
                      className={errors.time ? 'border-red-500' : ''}
                    />
                    {errors.time && (
                      <p className="text-sm text-red-500">{errors.time.message}</p>
                    )}
                  </div>
                </div>

                {/* Location */}
                <div className="space-y-2">
                  <Label htmlFor="location" className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Location
                  </Label>
                  <Input
                    id="location"
                    placeholder="Enter event location"
                    {...register('location')}
                    className={errors.location ? 'border-red-500' : ''}
                  />
                  {errors.location && (
                    <p className="text-sm text-red-500">{errors.location.message}</p>
                  )}
                </div>

                {/* Category */}
                <div className="space-y-2">
                  <Label htmlFor="category" className="flex items-center gap-2">
                    <Tag className="h-4 w-4" />
                    Category
                  </Label>
                  <select
                    id="category"
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value as EventCategory)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    {CATEGORY_OPTIONS.map((cat) => (
                      <option key={cat.value} value={cat.value}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-muted-foreground">
                    Select a category to help attendees discover your event
                  </p>
                </div>

                {/* Visibility */}
                <div className="space-y-3">
                  <Label>Event Visibility</Label>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <input
                        type="radio"
                        id="private"
                        value="false"
                        {...register('is_public')}
                        className="h-4 w-4"
                      />
                      <Label htmlFor="private" className="flex items-center gap-2 cursor-pointer">
                        <Lock className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <span className="font-medium">Private Event</span>
                          <p className="text-xs text-muted-foreground">Only organization members can see this event</p>
                        </div>
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="radio"
                        id="public"
                        value="true"
                        {...register('is_public')}
                        className="h-4 w-4"
                      />
                      <Label htmlFor="public" className="flex items-center gap-2 cursor-pointer">
                        <Globe className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <span className="font-medium">Public Event</span>
                          <p className="text-xs text-muted-foreground">Anyone can discover and view this event</p>
                        </div>
                      </Label>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Submit Buttons */}
            <div className="flex items-center gap-4">
              <Button 
                type="submit" 
                disabled={isSubmitting || isUpdating}
                className="flex-1"
              >
                {isSubmitting || isUpdating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin mr-2"></div>
                    Updating Event...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Update Event
                  </>
                )}
              </Button>
              <Link href={`/events/${eventId}`}>
                <Button variant="outline" type="button">
                  Cancel
                </Button>
              </Link>
            </div>

            {error && (
              <div className="p-3 rounded-md bg-red-50 border border-red-200">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}
          </form>
        </div>
      </div>
    </DashboardLayout>
  );
}