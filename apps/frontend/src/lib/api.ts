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

export type EventCategory = 'conference' | 'meetup' | 'workshop' | 'social' | 'networking' | 'webinar' | 'other';

export interface EventCategoryOption {
  value: EventCategory;
  label: string;
}

export interface Event {
  id: number;
  title: string;
  description: string | null;
  date: string;
  time: string;
  location: string;
  is_public: boolean;
  category: EventCategory;
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
  category?: EventCategory;
  organization_id?: number; // Required for admins, optional for organizers (uses their org)
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

    // Ensure we have the latest token (handles SSR -> client hydration)
    const token = this.getToken();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
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
    // If no cached token, try to read from cookies (handles SSR -> client hydration)
    if (!this.token && typeof window !== 'undefined') {
      this.token = this.getTokenFromCookies();
    }
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

  async getUserProfile(): Promise<{user: User}> {
    return this.request('/api/auth/profile');
  }

  async updateProfile(data: { first_name?: string; last_name?: string; email?: string }): Promise<ApiResponse & { user: User }> {
    return this.request('/api/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<ApiResponse> {
    return this.request('/api/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
    });
  }

  async deleteAccount(password: string): Promise<ApiResponse> {
    return this.request('/api/auth/account', {
      method: 'DELETE',
      body: JSON.stringify({ password }),
    });
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
    return this.request('/api/organization/create', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getOrganization(orgId: number): Promise<ApiResponse & { organization: Organization }> {
    return this.request(`/api/organization/${orgId}`);
  }

  async updateOrganization(orgId: number, data: Partial<CreateOrganizationRequest>): Promise<ApiResponse & { organization: Organization }> {
    return this.request(`/api/organization/${orgId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteOrganization(orgId: number): Promise<ApiResponse> {
    return this.request(`/api/organization/${orgId}`, {
      method: 'DELETE',
    });
  }

  async getOrganizationMembers(orgId: number): Promise<ApiResponse & { members: OrganizationMember[], member_count: number }> {
    return this.request(`/api/organization/${orgId}/members`);
  }

  async inviteUserToOrganization(orgId: number, data: InviteUserRequest): Promise<ApiResponse> {
    return this.request(`/api/organization/${orgId}/invite`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async removeOrganizationMember(orgId: number, memberId: number): Promise<ApiResponse> {
    return this.request(`/api/organization/${orgId}/members/${memberId}`, {
      method: 'DELETE',
    });
  }

  async changeMemberRole(orgId: number, memberId: number, role: string): Promise<ApiResponse> {
    return this.request(`/api/organization/${orgId}/members/${memberId}/role`, {
      method: 'PUT',
      body: JSON.stringify({ role }),
    });
  }

  async leaveOrganization(): Promise<ApiResponse> {
    return this.request('/api/organization/leave', {
      method: 'POST',
    });
  }

  async getOrganizations(filter: 'all' | 'active' | 'deleted' = 'active'): Promise<ApiResponse & { organizations: Organization[], count: number }> {
    return this.request(`/api/organization/list/${filter}`);
  }

  async getOrganizationInvitations(orgId: number): Promise<ApiResponse & { invitations: Invitation[] }> {
    return this.request(`/api/organization/${orgId}/invitations`);
  }

  // Event endpoints
  async getEvents(options?: {
    filter?: 'public' | 'my_org' | 'all';
    limit?: number;
    offset?: number;
    search?: string;
    date_from?: string;
    date_to?: string;
    category?: EventCategory;
  }): Promise<ApiResponse & { events: Event[], total_count: number }> {
    const params = new URLSearchParams();
    if (options?.filter) params.append('filter', options.filter);
    if (options?.limit) params.append('limit', options.limit.toString());
    if (options?.offset) params.append('offset', options.offset.toString());
    if (options?.search) params.append('search', options.search);
    if (options?.date_from) params.append('date_from', options.date_from);
    if (options?.date_to) params.append('date_to', options.date_to);
    if (options?.category) params.append('category', options.category);

    const queryString = params.toString();
    return this.request(`/api/events${queryString ? '?' + queryString : ''}`);
  }

  async getCategories(): Promise<ApiResponse & { categories: EventCategoryOption[] }> {
    return this.request('/api/events/categories');
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

  // Admin endpoints
  async getOrganizerRequests(): Promise<ApiResponse & { requests: Array<{
    id: number;
    first_name: string;
    last_name: string;
    email: string;
    created_at: string;
    role: string;
  }> }> {
    return this.request('/api/auth/admin/organizer-requests');
  }

  async approveOrganizerRequest(userId: number): Promise<ApiResponse> {
    return this.request(`/api/auth/admin/organizer-requests/${userId}/approve`, {
      method: 'POST',
    });
  }

  async rejectOrganizerRequest(userId: number): Promise<ApiResponse> {
    return this.request(`/api/auth/admin/organizer-requests/${userId}/reject`, {
      method: 'POST',
    });
  }

  // User Management (Admin)
  async getAllUsers(params?: { page?: number; per_page?: number; search?: string; role?: string }): Promise<ApiResponse & {
    users: Array<{
      id: number;
      first_name: string;
      last_name: string;
      email: string;
      role: string;
      organization_id: number | null;
      organization_name: string | null;
      pending_organizer_approval: boolean;
      created_at: string;
    }>;
    total_count: number;
    page: number;
    per_page: number;
    total_pages: number;
  }> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.per_page) queryParams.append('per_page', params.per_page.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.role) queryParams.append('role', params.role);

    const queryString = queryParams.toString();
    return this.request(`/api/auth/admin/users${queryString ? '?' + queryString : ''}`);
  }

  async changeUserRole(userId: number, role: string, organizationId?: number): Promise<ApiResponse & { user: User }> {
    const body: { role: string; organization_id?: number } = { role };
    if (organizationId) {
      body.organization_id = organizationId;
    }
    return this.request(`/api/auth/admin/users/${userId}/role`, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  }

  async adminDeleteUser(userId: number): Promise<ApiResponse> {
    return this.request(`/api/auth/admin/users/${userId}`, {
      method: 'DELETE',
    });
  }

  // Organization Management (Admin)
  async adminDeleteOrganization(orgId: number, removeMembers: boolean = true): Promise<ApiResponse & { affected_users: number; cancelled_invitations: number }> {
    return this.request(`/api/organization/admin/${orgId}`, {
      method: 'DELETE',
      body: JSON.stringify({ remove_members: removeMembers }),
    });
  }

  async adminRestoreOrganization(orgId: number): Promise<ApiResponse & { organization: Organization }> {
    return this.request(`/api/organization/admin/${orgId}/restore`, {
      method: 'POST',
    });
  }

  // Event Guest Invitation endpoints
  async inviteGuestsToEvent(eventId: number, guests: Array<{ email: string; name?: string }>): Promise<ApiResponse & {
    successful_invitations: Array<{ email: string; name: string; invitation_id: number }>;
    failed_invitations: Array<{ email: string; error: string }>;
    total_sent: number;
    total_failed: number;
  }> {
    return this.request(`/api/events/${eventId}/invite-guests`, {
      method: 'POST',
      body: JSON.stringify({ guests }),
    });
  }

  async getEventGuestList(eventId: number): Promise<ApiResponse & {
    event_id: number;
    event_title: string;
    guests: Array<{
      id: number;
      email: string;
      name: string;
      status: 'pending' | 'accepted' | 'declined';
      invited_at: string | null;
      responded_at: string | null;
    }>;
    status_counts: {
      pending: number;
      accepted: number;
      declined: number;
      total: number;
    };
  }> {
    return this.request(`/api/events/${eventId}/guest-list`);
  }

  // Chat endpoint
  async sendChatMessage(message: string): Promise<ApiResponse & { response: string }> {
    return this.request('/api/chat/message', {
      method: 'POST',
      body: JSON.stringify({ message }),
    });
  }
}

export const apiClient = new ApiClient();
export { ApiError };