'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useReduxAuth } from '@/hooks/useReduxAuth';
import { useToast } from '@/components/ui/toast';
import { useAppDispatch, useAppSelector } from '@/lib/redux/hooks';
import { createEvent } from '@/lib/redux/features/eventsSlice';
import { createEventSchema, CreateEventFormData } from '@/lib/validations/auth';
import { Calendar, ArrowLeft, MapPin, Clock, Users, Globe, Lock } from 'lucide-react';
import Link from 'next/link';
import DashboardLayout from '@/components/DashboardLayout';

export default function CreateEventPage() {
  const { user, isAuthenticated } = useReduxAuth();
  const { success, error: errorToast } = useToast();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { isCreating, error } = useAppSelector((state) => state.events);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
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

  const isPublic = watch('is_public');

  // Redirect if not authenticated or not an organizer
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    if (user?.role !== 'organizer' && user?.role !== 'admin') {
      router.push('/events');
      return;
    }

    if (!user?.organization_id && user?.role !== 'admin') {
      router.push('/organizations/create');
      return;
    }
  }, [isAuthenticated, user, router]);

  // Show loading or return null while redirecting
  if (!isAuthenticated || (user?.role !== 'organizer' && user?.role !== 'admin') || (!user?.organization_id && user?.role !== 'admin')) {
    return null;
  }

  const onSubmit = async (data: CreateEventFormData) => {
    try {
      const result = await dispatch(createEvent({
        title: data.title,
        description: data.description || undefined,
        date: data.date,
        time: data.time,
        location: data.location,
        is_public: data.is_public,
      })).unwrap();

      success('Event Created', `${result.title} has been created successfully!`);
      router.push('/events');
    } catch (error) {
      const message = typeof error === 'string' ? error : 'Failed to create event';
      errorToast('Creation Failed', message);
    }
  };

  // Get today's date in YYYY-MM-DD format
  const today = new Date().toISOString().split('T')[0];

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="max-w-2xl mx-auto">
          <div className="mb-8">
            <div className="flex items-center gap-4 mb-4">
              <Link href="/events">
                <Button variant="ghost" size="sm" className="gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Back to Events
                </Button>
              </Link>
            </div>
            <div className="flex items-center gap-3 mb-4">
              <Calendar className="h-8 w-8 text-primary" />
              <div>
                <h2 className="text-3xl font-bold">Create New Event</h2>
                <p className="text-muted-foreground">
                  Plan and organize your next event for your organization
                </p>
              </div>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Event Details
              </CardTitle>
              <CardDescription>
                Provide information about your event. All fields marked with * are required.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                {/* Event Title */}
                <div className="space-y-2">
                  <Label htmlFor="title">Event Title *</Label>
                  <Input
                    id="title"
                    type="text"
                    placeholder="Enter event title"
                    className={errors.title ? 'border-red-500 focus:border-red-500' : ''}
                    {...register('title')}
                  />
                  {errors.title && (
                    <p className="text-sm text-red-600">{errors.title.message}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Choose a clear and descriptive title for your event
                  </p>
                </div>

                {/* Event Description */}
                <div className="space-y-2">
                  <Label htmlFor="description">Description (Optional)</Label>
                  <textarea
                    id="description"
                    rows={4}
                    placeholder="Describe your event..."
                    className={`flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none ${
                      errors.description ? 'border-red-500 focus:border-red-500' : ''
                    }`}
                    {...register('description')}
                  />
                  {errors.description && (
                    <p className="text-sm text-red-600">{errors.description.message}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Provide details about what attendees can expect
                  </p>
                </div>

                {/* Date and Time */}
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="date">Event Date *</Label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="date"
                        type="date"
                        min={today}
                        className={`pl-10 ${errors.date ? 'border-red-500 focus:border-red-500' : ''}`}
                        {...register('date')}
                      />
                    </div>
                    {errors.date && (
                      <p className="text-sm text-red-600">{errors.date.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="time">Event Time *</Label>
                    <div className="relative">
                      <Clock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="time"
                        type="time"
                        className={`pl-10 ${errors.time ? 'border-red-500 focus:border-red-500' : ''}`}
                        {...register('time')}
                      />
                    </div>
                    {errors.time && (
                      <p className="text-sm text-red-600">{errors.time.message}</p>
                    )}
                  </div>
                </div>

                {/* Location */}
                <div className="space-y-2">
                  <Label htmlFor="location">Location *</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="location"
                      type="text"
                      placeholder="Enter event location"
                      className={`pl-10 ${errors.location ? 'border-red-500 focus:border-red-500' : ''}`}
                      {...register('location')}
                    />
                  </div>
                  {errors.location && (
                    <p className="text-sm text-red-600">{errors.location.message}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Include full address or venue name for easy finding
                  </p>
                </div>

                {/* Event Visibility */}
                <div className="space-y-4">
                  <Label>Event Visibility</Label>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3">
                      <input
                        type="radio"
                        id="private"
                        value="false"
                        className="h-4 w-4"
                        {...register('is_public')}
                        defaultChecked
                      />
                      <Label htmlFor="private" className="flex items-center gap-2 cursor-pointer">
                        <Lock className="h-4 w-4 text-blue-600" />
                        <div>
                          <span className="font-medium">Private Event</span>
                          <p className="text-xs text-muted-foreground">
                            Only visible to your organization members
                          </p>
                        </div>
                      </Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <input
                        type="radio"
                        id="public"
                        value="true"
                        className="h-4 w-4"
                        {...register('is_public')}
                      />
                      <Label htmlFor="public" className="flex items-center gap-2 cursor-pointer">
                        <Globe className="h-4 w-4 text-green-600" />
                        <div>
                          <span className="font-medium">Public Event</span>
                          <p className="text-xs text-muted-foreground">
                            Visible to everyone on the platform
                          </p>
                        </div>
                      </Label>
                    </div>
                  </div>
                </div>

                {error && (
                  <div className="p-3 rounded-md bg-red-50 border border-red-200">
                    <p className="text-sm text-red-600">{error}</p>
                  </div>
                )}

                <div className="flex gap-4">
                  <Button
                    type="submit"
                    disabled={isCreating || isSubmitting}
                    className="flex-1"
                  >
                    {(isCreating || isSubmitting) ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-primary-foreground/20 border-t-primary-foreground rounded-full animate-spin"></div>
                        Creating Event...
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        Create Event
                      </div>
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.push('/events')}
                    disabled={isCreating || isSubmitting}
                  >
                    Cancel
                  </Button>
                </div>

                {/* Preview Card */}
                <div className="mt-6 p-4 rounded-md bg-accent/50 border border-accent">
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">Preview:</h4>
                  <div className="space-y-2">
                    <p className="font-medium">
                      {watch('title') || 'Event Title'}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {watch('date') || 'Date'} at {watch('time') || 'Time'}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {watch('location') || 'Location'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        isPublic 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-blue-100 text-blue-700'
                      }`}>
                        {isPublic ? 'Public' : 'Private'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-md bg-blue-50 border border-blue-200">
                  <h4 className="text-sm font-medium text-blue-900 mb-2">What happens next?</h4>
                  <ul className="text-xs text-blue-700 space-y-1">
                    <li>• Your event will be created and visible to the selected audience</li>
                    <li>• Organization members will be able to see and attend the event</li>
                    <li>• You can edit or manage the event details anytime</li>
                    <li>• Event analytics and attendance tracking will be available</li>
                  </ul>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}