'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useReduxAuth } from '@/hooks/useReduxAuth';
import { apiClient, Event, EventCategory } from '@/lib/api';
import { List, Tag, Eye, Calendar as CalendarIcon } from 'lucide-react';
import Link from 'next/link';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';

const CATEGORY_OPTIONS: { value: EventCategory; label: string; color: string; bgColor: string }[] = [
  { value: 'conference', label: 'Conference', color: '#7c3aed', bgColor: '#ede9fe' },
  { value: 'meetup', label: 'Meetup', color: '#2563eb', bgColor: '#dbeafe' },
  { value: 'workshop', label: 'Workshop', color: '#16a34a', bgColor: '#dcfce7' },
  { value: 'social', label: 'Social', color: '#ec4899', bgColor: '#fce7f3' },
  { value: 'networking', label: 'Networking', color: '#ea580c', bgColor: '#ffedd5' },
  { value: 'webinar', label: 'Webinar', color: '#0891b2', bgColor: '#cffafe' },
  { value: 'other', label: 'Other', color: '#6b7280', bgColor: '#f3f4f6' },
];

const categoryColorMap: Record<string, string> = Object.fromEntries(
  CATEGORY_OPTIONS.map(c => [c.value, c.color])
);

export default function CalendarPage() {
  const { user } = useReduxAuth();
  const router = useRouter();
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentFilter, setCurrentFilter] = useState<'public' | 'my_org' | 'all'>('public');
  const [categoryFilter, setCategoryFilter] = useState<EventCategory | null>(null);

  const fetchCalendarEvents = useCallback(async (dateFrom?: string, dateTo?: string) => {
    setIsLoading(true);
    try {
      const response = await apiClient.getEvents({
        filter: currentFilter,
        date_from: dateFrom,
        date_to: dateTo,
        category: categoryFilter || undefined,
        limit: 100,
      });
      setEvents(response.events);
    } catch {
      // silently fail, events just won't show
    } finally {
      setIsLoading(false);
    }
  }, [currentFilter, categoryFilter]);

  useEffect(() => {
    fetchCalendarEvents();
  }, [fetchCalendarEvents]);

  const handleDatesSet = useCallback((dateInfo: { startStr: string; endStr: string }) => {
    const dateFrom = dateInfo.startStr.split('T')[0];
    const dateTo = dateInfo.endStr.split('T')[0];
    fetchCalendarEvents(dateFrom, dateTo);
  }, [fetchCalendarEvents]);

  const calendarEvents = events.map(event => ({
    id: String(event.id),
    title: event.title,
    start: `${event.date}T${event.time}`,
    backgroundColor: categoryColorMap[event.category] || '#6b7280',
    borderColor: categoryColorMap[event.category] || '#6b7280',
    extendedProps: {
      location: event.location,
      category: event.category,
      is_public: event.is_public,
      organization_name: event.organization_name,
    },
  }));

  return (
    <DashboardLayout requireAuth={true}>
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-3xl font-bold mb-2">Calendar View</h2>
            <p className="text-muted-foreground">
              View events on a calendar
            </p>
          </div>
          <Link href="/events">
            <Button variant="outline">
              <List className="h-4 w-4 mr-2" />
              List View
            </Button>
          </Link>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Filters</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Event Type Filters */}
            <div className="flex gap-2">
              <Button
                variant={currentFilter === 'public' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCurrentFilter('public')}
              >
                <Eye className="h-4 w-4 mr-2" />
                Public Events
              </Button>
              {user?.organization_id && (
                <Button
                  variant={currentFilter === 'my_org' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setCurrentFilter('my_org')}
                >
                  <CalendarIcon className="h-4 w-4 mr-2" />
                  Organization Events
                </Button>
              )}
              {user?.role === 'admin' && (
                <Button
                  variant={currentFilter === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setCurrentFilter('all')}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  All Events
                </Button>
              )}
            </div>

            {/* Category Filters */}
            <div className="flex flex-wrap items-center gap-2">
              <Tag className="h-4 w-4 text-muted-foreground" />
              <Button
                variant={categoryFilter === null ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCategoryFilter(null)}
              >
                All
              </Button>
              {CATEGORY_OPTIONS.map((cat) => (
                <Button
                  key={cat.value}
                  variant={categoryFilter === cat.value ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setCategoryFilter(cat.value)}
                  style={categoryFilter === cat.value ? { backgroundColor: cat.color } : {}}
                >
                  {cat.label}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Calendar */}
        <Card>
          <CardContent className="p-4">
            {isLoading && (
              <div className="text-center py-2 text-sm text-muted-foreground">
                Loading events...
              </div>
            )}
            <FullCalendar
              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
              initialView="dayGridMonth"
              headerToolbar={{
                left: 'prev,next today',
                center: 'title',
                right: 'dayGridMonth,timeGridWeek',
              }}
              events={calendarEvents}
              datesSet={handleDatesSet}
              eventClick={(info) => {
                router.push(`/events/${info.event.id}`);
              }}
              height="auto"
              eventTimeFormat={{
                hour: 'numeric',
                minute: '2-digit',
                meridiem: 'short',
              }}
              dayMaxEvents={3}
              eventDisplay="block"
            />
          </CardContent>
        </Card>

        {/* Legend */}
        <Card className="mt-4">
          <CardContent className="py-3 px-4">
            <div className="flex flex-wrap items-center gap-4">
              <span className="text-xs text-muted-foreground font-medium">Categories:</span>
              {CATEGORY_OPTIONS.map((cat) => (
                <div key={cat.value} className="flex items-center gap-1.5">
                  <div
                    className="w-3 h-3 rounded-sm"
                    style={{ backgroundColor: cat.color }}
                  />
                  <span className="text-xs text-muted-foreground">{cat.label}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
