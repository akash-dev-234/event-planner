import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { apiClient, Event, CreateEventRequest, ApiError } from '@/lib/api';

interface EventsState {
  events: Event[];
  currentEvent: Event | null;
  totalCount: number;
  isLoading: boolean;
  error: string | null;
  currentFilter: 'public' | 'my_org' | 'all';
  isCreating: boolean;
}

const initialState: EventsState = {
  events: [],
  currentEvent: null,
  totalCount: 0,
  isLoading: false,
  error: null,
  currentFilter: 'public',
  isCreating: false,
};

// Async thunks
export const fetchEvents = createAsyncThunk(
  'events/fetchEvents',
  async ({ filter = 'public', limit = 50, offset = 0 }: { 
    filter?: 'public' | 'my_org' | 'all';
    limit?: number;
    offset?: number;
  } = {}, { rejectWithValue }) => {
    try {
      const response = await apiClient.getEvents(filter, limit, offset);
      return {
        events: response.events,
        totalCount: response.total_count,
        filter,
      };
    } catch (error) {
      if (error instanceof ApiError) {
        return rejectWithValue(error.message);
      }
      return rejectWithValue('Failed to fetch events');
    }
  }
);

export const fetchEvent = createAsyncThunk(
  'events/fetchEvent',
  async (eventId: number, { rejectWithValue }) => {
    try {
      const response = await apiClient.getEvent(eventId);
      return response.event;
    } catch (error) {
      if (error instanceof ApiError) {
        return rejectWithValue(error.message);
      }
      return rejectWithValue('Failed to fetch event');
    }
  }
);

export const createEvent = createAsyncThunk(
  'events/createEvent',
  async (data: CreateEventRequest, { rejectWithValue }) => {
    try {
      const response = await apiClient.createEvent(data);
      return response.event;
    } catch (error) {
      if (error instanceof ApiError) {
        return rejectWithValue(error.message);
      }
      return rejectWithValue('Failed to create event');
    }
  }
);

export const updateEvent = createAsyncThunk(
  'events/updateEvent',
  async ({ eventId, data }: { eventId: number; data: Partial<CreateEventRequest> }, { rejectWithValue }) => {
    try {
      const response = await apiClient.updateEvent(eventId, data);
      return response.event;
    } catch (error) {
      if (error instanceof ApiError) {
        return rejectWithValue(error.message);
      }
      return rejectWithValue('Failed to update event');
    }
  }
);

export const deleteEvent = createAsyncThunk(
  'events/deleteEvent',
  async (eventId: number, { rejectWithValue }) => {
    try {
      await apiClient.deleteEvent(eventId);
      return eventId;
    } catch (error) {
      if (error instanceof ApiError) {
        return rejectWithValue(error.message);
      }
      return rejectWithValue('Failed to delete event');
    }
  }
);

const eventsSlice = createSlice({
  name: 'events',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setCurrentFilter: (state, action: PayloadAction<'public' | 'my_org' | 'all'>) => {
      state.currentFilter = action.payload;
    },
    clearCurrentEvent: (state) => {
      state.currentEvent = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Events
      .addCase(fetchEvents.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchEvents.fulfilled, (state, action) => {
        state.isLoading = false;
        state.events = action.payload.events;
        state.totalCount = action.payload.totalCount;
        state.currentFilter = action.payload.filter;
        state.error = null;
      })
      .addCase(fetchEvents.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Fetch Single Event
      .addCase(fetchEvent.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchEvent.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentEvent = action.payload;
        state.error = null;
      })
      .addCase(fetchEvent.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Create Event
      .addCase(createEvent.pending, (state) => {
        state.isCreating = true;
        state.error = null;
      })
      .addCase(createEvent.fulfilled, (state, action) => {
        state.isCreating = false;
        state.events.unshift(action.payload);
        state.error = null;
      })
      .addCase(createEvent.rejected, (state, action) => {
        state.isCreating = false;
        state.error = action.payload as string;
      })
      // Update Event
      .addCase(updateEvent.fulfilled, (state, action) => {
        const index = state.events.findIndex(event => event.id === action.payload.id);
        if (index !== -1) {
          state.events[index] = action.payload;
        }
        if (state.currentEvent && state.currentEvent.id === action.payload.id) {
          state.currentEvent = action.payload;
        }
      })
      // Delete Event
      .addCase(deleteEvent.fulfilled, (state, action) => {
        state.events = state.events.filter(event => event.id !== action.payload);
        if (state.currentEvent && state.currentEvent.id === action.payload) {
          state.currentEvent = null;
        }
      });
  },
});

export const { clearError, setCurrentFilter, clearCurrentEvent } = eventsSlice.actions;
export default eventsSlice.reducer;