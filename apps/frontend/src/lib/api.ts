const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';

export interface ApiResponse {
  message: string;
  [key: string]: unknown;
}

export interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  role: 'guest' | 'team_member' | 'organizer' | 'admin';
  organization_id: number | null;
}

export interface AuthResponse {
  message: string;
  token: string;
  user: User;
  pending_invitations_count?: number;
  pending_invitations?: Array<{
    id: number;
    organization_name: string;
    role: string;
    expires_at: string;
  }>;
}

export interface RegisterRequest {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  role?: 'guest' | 'organizer';
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  password: string;
}

export interface Organization {
  id: number;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
  member_count?: number;
  members?: OrganizationMember[];
}

export interface OrganizationMember {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  role: 'guest' | 'team_member' | 'organizer' | 'admin';
  created_at: string;
  is_current_user: boolean;
}

export interface CreateOrganizationRequest {
  name: string;
  description?: string;
}

export interface InviteUserRequest {
  email: string;
  role: 'guest' | 'team_member';
}

export interface Invitation {
  id: number;
  email: string;
  role: string;
  expires_at: string;
  organization?: {
    id: number;
    name: string;
    description: string;
  };
}

export interface Event {
  id: number;
  title: string;
  description: string | null;
  date: string;
  time: string;
  location: string;
  is_public: boolean;
  organization_id: number;
  user_id: number;
  created_at: string;
  updated_at: string;
  organization_name?: string;
  organizer?: {
    id: number;
    name: string;
    email: string;
  };
  can_edit?: boolean;
}

export interface CreateEventRequest {
  title: string;
  description?: string;
  date: string;
  time: string;
  location: string;
  is_public?: boolean;
}

class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public data?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

class ApiClient {
  private baseURL: string;
  private token: string | null = null;

  constructor() {
    this.baseURL = API_BASE_URL;
    
    // Initialize token from cookies if available
    if (typeof window !== 'undefined') {
      this.token = this.getTokenFromCookies();
    }
  }

  private getTokenFromCookies(): string | null {
    if (typeof document === 'undefined') return null;
    const cookies = document.cookie.split(';');
    for (const cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name === 'token') {
        return value;
      }
    }
    return null;
  }

  private setCookie(name: string, value: string, maxAge: number = 86400) {
    if (typeof document !== 'undefined') {
      document.cookie = `${name}=${value}; path=/; max-age=${maxAge}; SameSite=Lax`;
    }
  }

  private deleteCookie(name: string) {
    if (typeof document !== 'undefined') {
      document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT`;
    }
  }

  private async request<T = unknown>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    const config: RequestInit = {
      ...options,
      headers,
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        throw new ApiError(
          data.error || data.message || 'An error occurred',
          response.status,
          data
        );
      }

      return data;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      
      // Network or other errors
      throw new ApiError(
        'Network error occurred. Please check your connection.',
        0
      );
    }
  }

  public setToken(token: string | null) {
    this.token = token;
    if (token) {
      this.setCookie('token', token);
    } else {
      this.deleteCookie('token');
    }
  }

  public getToken(): string | null {
    return this.token;
  }

  public clearToken() {
    this.setToken(null);
  }

  // Auth endpoints
  async register(data: RegisterRequest): Promise<ApiResponse> {
    return this.request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async login(data: LoginRequest): Promise<AuthResponse> {
    const response = await this.request<AuthResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    
    if (response.token) {
      this.setToken(response.token);
    }
    
    return response;
  }

  async logout() {
    this.clearToken();
  }

  async forgotPassword(data: ForgotPasswordRequest): Promise<ApiResponse> {
    return this.request('/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async resetPassword(token: string, data: ResetPasswordRequest): Promise<ApiResponse> {
    return this.request(`/api/auth/reset-password/${token}`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // User endpoints
  async getCurrentUser(): Promise<User> {
    // This would need to be implemented on the backend
    return this.request('/api/auth/user/me');
  }

  async getMyInvitations(): Promise<ApiResponse> {
    return this.request('/api/auth/my-invitations');
  }

  async acceptInvitation(invitationId: number): Promise<ApiResponse> {
    return this.request('/api/auth/accept-invitation', {
      method: 'POST',
      body: JSON.stringify({ invitation_id: invitationId }),
    });
  }

  // Organization endpoints
  async createOrganization(data: CreateOrganizationRequest): Promise<ApiResponse & { organization: Organization }> {
    return this.request('/api/organizations/create', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getOrganization(orgId: number): Promise<ApiResponse & { organization: Organization }> {
    return this.request(`/api/organizations/${orgId}`);
  }

  async updateOrganization(orgId: number, data: Partial<CreateOrganizationRequest>): Promise<ApiResponse & { organization: Organization }> {
    return this.request(`/api/organizations/${orgId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteOrganization(orgId: number): Promise<ApiResponse> {
    return this.request(`/api/organizations/${orgId}`, {
      method: 'DELETE',
    });
  }

  async getOrganizationMembers(orgId: number): Promise<ApiResponse & { members: OrganizationMember[], member_count: number }> {
    return this.request(`/api/organizations/${orgId}/members`);
  }

  async inviteUserToOrganization(orgId: number, data: InviteUserRequest): Promise<ApiResponse> {
    return this.request(`/api/organizations/${orgId}/invite`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async removeOrganizationMember(orgId: number, memberId: number): Promise<ApiResponse> {
    return this.request(`/api/organizations/${orgId}/members/${memberId}`, {
      method: 'DELETE',
    });
  }

  async changeMemberRole(orgId: number, memberId: number, role: string): Promise<ApiResponse> {
    return this.request(`/api/organizations/${orgId}/members/${memberId}/role`, {
      method: 'PUT',
      body: JSON.stringify({ role }),
    });
  }

  async leaveOrganization(): Promise<ApiResponse> {
    return this.request('/api/organizations/leave', {
      method: 'POST',
    });
  }

  async getOrganizationInvitations(orgId: number): Promise<ApiResponse & { invitations: Invitation[] }> {
    return this.request(`/api/organizations/${orgId}/invitations`);
  }

  // Event endpoints
  async getEvents(filter?: 'public' | 'my_org' | 'all', limit?: number, offset?: number): Promise<ApiResponse & { events: Event[], total_count: number }> {
    const params = new URLSearchParams();
    if (filter) params.append('filter', filter);
    if (limit) params.append('limit', limit.toString());
    if (offset) params.append('offset', offset.toString());
    
    const queryString = params.toString();
    return this.request(`/api/events${queryString ? '?' + queryString : ''}`);
  }

  async getEvent(eventId: number): Promise<ApiResponse & { event: Event }> {
    return this.request(`/api/events/${eventId}`);
  }

  async createEvent(data: CreateEventRequest): Promise<ApiResponse & { event: Event }> {
    return this.request('/api/events/create', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateEvent(eventId: number, data: Partial<CreateEventRequest>): Promise<ApiResponse & { event: Event }> {
    return this.request(`/api/events/${eventId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteEvent(eventId: number): Promise<ApiResponse> {
    return this.request(`/api/events/${eventId}`, {
      method: 'DELETE',
    });
  }
}

export const apiClient = new ApiClient();
export { ApiError };