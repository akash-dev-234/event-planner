import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { apiClient, User, LoginRequest, RegisterRequest, ApiError } from '@/lib/api';

// Helper function to get cookie value
function getCookieValue(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const [cookieName, cookieValue] = cookie.trim().split('=');
    if (cookieName === name) {
      return cookieValue;
    }
  }
  return null;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
  isAuthenticated: boolean;
}

const initialState: AuthState = {
  user: null,
  token: null,
  isLoading: false,
  error: null,
  isAuthenticated: false,
};

// Async thunks
export const loginUser = createAsyncThunk(
  'auth/login',
  async (credentials: LoginRequest, { rejectWithValue }) => {
    try {
      const response = await apiClient.login(credentials);
      return {
        user: response.user,
        token: response.token,
        pendingInvitations: response.pending_invitations || [],
      };
    } catch (error) {
      if (error instanceof ApiError) {
        return rejectWithValue(error.message);
      }
      return rejectWithValue('An unexpected error occurred');
    }
  }
);

export const registerUser = createAsyncThunk(
  'auth/register',
  async (userData: RegisterRequest, { rejectWithValue }) => {
    try {
      const response = await apiClient.register(userData);
      return response;
    } catch (error) {
      if (error instanceof ApiError) {
        return rejectWithValue(error.message);
      }
      return rejectWithValue('An unexpected error occurred');
    }
  }
);

export const forgotPassword = createAsyncThunk(
  'auth/forgotPassword',
  async (email: string, { rejectWithValue }) => {
    try {
      const response = await apiClient.forgotPassword({ email });
      return response;
    } catch (error) {
      if (error instanceof ApiError) {
        return rejectWithValue(error.message);
      }
      return rejectWithValue('An unexpected error occurred');
    }
  }
);

export const resetPassword = createAsyncThunk(
  'auth/resetPassword',
  async ({ token, password }: { token: string; password: string }, { rejectWithValue }) => {
    try {
      const response = await apiClient.resetPassword(token, { password });
      return response;
    } catch (error) {
      if (error instanceof ApiError) {
        return rejectWithValue(error.message);
      }
      return rejectWithValue('An unexpected error occurred');
    }
  }
);

export const initializeAuth = createAsyncThunk(
  'auth/initialize',
  async (_, { rejectWithValue }) => {
    try {
      const token = apiClient.getToken();
      
      if (!token) {
        return null;
      }
      
      // Validate token by fetching current user profile
      try {
        const profileResponse = await apiClient.getUserProfile();
        return { 
          token, 
          user: profileResponse.user 
        };
      } catch (error) {
        // Token is invalid or expired, clear it
        apiClient.clearToken();
        // Clear user data cookies
        if (typeof document !== 'undefined') {
          document.cookie = 'userData=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT';
          document.cookie = 'userRole=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT';
          document.cookie = 'organizationId=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT';
        }
        return null;
      }
    } catch (error) {
      apiClient.clearToken();
      return rejectWithValue('Token initialization failed');
    }
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.error = null;
      apiClient.clearToken();
      // Clear all cookies
      if (typeof window !== 'undefined') {
        document.cookie = 'userData=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT';
        document.cookie = 'userRole=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT';
        document.cookie = 'organizationId=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT';
      }
    },
    clearError: (state) => {
      state.error = null;
    },
    setUser: (state, action: PayloadAction<User>) => {
      state.user = action.payload;
      state.isAuthenticated = true;
    },
  },
  extraReducers: (builder) => {
    builder
      // Login
      .addCase(loginUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.isAuthenticated = true;
        state.error = null;
        // Set cookies for middleware and store complete user data
        if (typeof window !== 'undefined') {
          // Store complete user data in cookie for initialization
          const userData = encodeURIComponent(JSON.stringify(action.payload.user));
          document.cookie = `userData=${userData}; path=/; max-age=86400; SameSite=Lax`;
          
          // Set cookies for middleware
          document.cookie = `userRole=${action.payload.user.role}; path=/; max-age=86400; SameSite=Lax`;
          if (action.payload.user.organization_id) {
            document.cookie = `organizationId=${action.payload.user.organization_id}; path=/; max-age=86400; SameSite=Lax`;
          } else {
            document.cookie = 'organizationId=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT';
          }
        }
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
        state.isAuthenticated = false;
      })
      // Register
      .addCase(registerUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(registerUser.fulfilled, (state) => {
        state.isLoading = false;
        state.error = null;
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Forgot Password
      .addCase(forgotPassword.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(forgotPassword.fulfilled, (state) => {
        state.isLoading = false;
        state.error = null;
      })
      .addCase(forgotPassword.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Reset Password
      .addCase(resetPassword.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(resetPassword.fulfilled, (state) => {
        state.isLoading = false;
        state.error = null;
      })
      .addCase(resetPassword.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Initialize Auth
      .addCase(initializeAuth.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(initializeAuth.fulfilled, (state, action) => {
        state.isLoading = false;
        if (action.payload?.token) {
          state.token = action.payload.token;
          state.isAuthenticated = true;
          // Make sure apiClient also has the token
          apiClient.setToken(action.payload.token);
          if (action.payload.user) {
            state.user = action.payload.user;
            // Refresh cookies with latest user data
            if (typeof window !== 'undefined') {
              const userData = encodeURIComponent(JSON.stringify(action.payload.user));
              document.cookie = `userData=${userData}; path=/; max-age=86400; SameSite=Lax`;
              document.cookie = `userRole=${action.payload.user.role}; path=/; max-age=86400; SameSite=Lax`;
              if (action.payload.user.organization_id) {
                document.cookie = `organizationId=${action.payload.user.organization_id}; path=/; max-age=86400; SameSite=Lax`;
              } else {
                document.cookie = 'organizationId=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT';
              }
            }
          }
        }
      })
      .addCase(initializeAuth.rejected, (state) => {
        state.isLoading = false;
        state.user = null;
        state.token = null;
        state.isAuthenticated = false;
      });
  },
});

export const { logout, clearError, setUser } = authSlice.actions;
export default authSlice.reducer;