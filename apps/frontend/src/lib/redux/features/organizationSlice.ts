import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { apiClient, Organization, OrganizationMember, CreateOrganizationRequest, InviteUserRequest, Invitation, ApiError } from '@/lib/api';

interface OrganizationState {
  currentOrganization: Organization | null;
  members: OrganizationMember[];
  invitations: Invitation[];
  myInvitations: Invitation[];
  isLoading: boolean;
  error: string | null;
  isCreating: boolean;
  isInviting: boolean;
}

const initialState: OrganizationState = {
  currentOrganization: null,
  members: [],
  invitations: [],
  myInvitations: [],
  isLoading: false,
  error: null,
  isCreating: false,
  isInviting: false,
};

// Async thunks
export const createOrganization = createAsyncThunk(
  'organization/create',
  async (data: CreateOrganizationRequest, { rejectWithValue }) => {
    try {
      const response = await apiClient.createOrganization(data);
      return response.organization;
    } catch (error) {
      if (error instanceof ApiError) {
        return rejectWithValue(error.message);
      }
      return rejectWithValue('Failed to create organization');
    }
  }
);

export const fetchOrganization = createAsyncThunk(
  'organization/fetch',
  async (orgId: number, { rejectWithValue }) => {
    try {
      const response = await apiClient.getOrganization(orgId);
      return response.organization;
    } catch (error) {
      if (error instanceof ApiError) {
        return rejectWithValue(error.message);
      }
      return rejectWithValue('Failed to fetch organization');
    }
  }
);

export const fetchOrganizationMembers = createAsyncThunk(
  'organization/fetchMembers',
  async (orgId: number, { rejectWithValue }) => {
    try {
      const response = await apiClient.getOrganizationMembers(orgId);
      return response.members;
    } catch (error) {
      if (error instanceof ApiError) {
        return rejectWithValue(error.message);
      }
      return rejectWithValue('Failed to fetch organization members');
    }
  }
);

export const inviteUserToOrganization = createAsyncThunk(
  'organization/inviteUser',
  async ({ orgId, data }: { orgId: number; data: InviteUserRequest }, { rejectWithValue }) => {
    try {
      const response = await apiClient.inviteUserToOrganization(orgId, data);
      return response;
    } catch (error) {
      if (error instanceof ApiError) {
        return rejectWithValue(error.message);
      }
      return rejectWithValue('Failed to send invitation');
    }
  }
);

export const fetchMyInvitations = createAsyncThunk(
  'organization/fetchMyInvitations',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiClient.getMyInvitations();
      return response.invitations || [];
    } catch (error) {
      if (error instanceof ApiError) {
        return rejectWithValue(error.message);
      }
      return rejectWithValue('Failed to fetch invitations');
    }
  }
);

export const acceptInvitation = createAsyncThunk(
  'organization/acceptInvitation',
  async (invitationId: number, { rejectWithValue }) => {
    try {
      const response = await apiClient.acceptInvitation(invitationId);
      return { invitationId, response };
    } catch (error) {
      if (error instanceof ApiError) {
        return rejectWithValue(error.message);
      }
      return rejectWithValue('Failed to accept invitation');
    }
  }
);

export const removeOrganizationMember = createAsyncThunk(
  'organization/removeMember',
  async ({ orgId, memberId }: { orgId: number; memberId: number }, { rejectWithValue }) => {
    try {
      const response = await apiClient.removeOrganizationMember(orgId, memberId);
      return { memberId, response };
    } catch (error) {
      if (error instanceof ApiError) {
        return rejectWithValue(error.message);
      }
      return rejectWithValue('Failed to remove member');
    }
  }
);

export const changeMemberRole = createAsyncThunk(
  'organization/changeMemberRole',
  async ({ orgId, memberId, role }: { orgId: number; memberId: number; role: string }, { rejectWithValue }) => {
    try {
      const response = await apiClient.changeMemberRole(orgId, memberId, role);
      return { memberId, role, response };
    } catch (error) {
      if (error instanceof ApiError) {
        return rejectWithValue(error.message);
      }
      return rejectWithValue('Failed to change member role');
    }
  }
);

export const leaveOrganization = createAsyncThunk(
  'organization/leave',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiClient.leaveOrganization();
      return response;
    } catch (error) {
      if (error instanceof ApiError) {
        return rejectWithValue(error.message);
      }
      return rejectWithValue('Failed to leave organization');
    }
  }
);

const organizationSlice = createSlice({
  name: 'organization',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearCurrentOrganization: (state) => {
      state.currentOrganization = null;
      state.members = [];
      state.invitations = [];
    },
  },
  extraReducers: (builder) => {
    builder
      // Create Organization
      .addCase(createOrganization.pending, (state) => {
        state.isCreating = true;
        state.error = null;
      })
      .addCase(createOrganization.fulfilled, (state, action) => {
        state.isCreating = false;
        state.currentOrganization = action.payload;
        state.error = null;
      })
      .addCase(createOrganization.rejected, (state, action) => {
        state.isCreating = false;
        state.error = action.payload as string;
      })
      // Fetch Organization
      .addCase(fetchOrganization.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchOrganization.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentOrganization = action.payload;
        state.error = null;
      })
      .addCase(fetchOrganization.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Fetch Members
      .addCase(fetchOrganizationMembers.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchOrganizationMembers.fulfilled, (state, action) => {
        state.isLoading = false;
        state.members = action.payload;
        state.error = null;
      })
      .addCase(fetchOrganizationMembers.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Invite User
      .addCase(inviteUserToOrganization.pending, (state) => {
        state.isInviting = true;
        state.error = null;
      })
      .addCase(inviteUserToOrganization.fulfilled, (state) => {
        state.isInviting = false;
        state.error = null;
      })
      .addCase(inviteUserToOrganization.rejected, (state, action) => {
        state.isInviting = false;
        state.error = action.payload as string;
      })
      // Fetch My Invitations
      .addCase(fetchMyInvitations.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchMyInvitations.fulfilled, (state, action) => {
        state.isLoading = false;
        state.myInvitations = action.payload;
        state.error = null;
      })
      .addCase(fetchMyInvitations.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Accept Invitation
      .addCase(acceptInvitation.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(acceptInvitation.fulfilled, (state, action) => {
        state.isLoading = false;
        state.myInvitations = state.myInvitations.filter(
          inv => inv.id !== action.payload.invitationId
        );
        state.error = null;
      })
      .addCase(acceptInvitation.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Remove Member
      .addCase(removeOrganizationMember.fulfilled, (state, action) => {
        state.members = state.members.filter(
          member => member.id !== action.payload.memberId
        );
      })
      // Change Member Role
      .addCase(changeMemberRole.fulfilled, (state, action) => {
        const member = state.members.find(m => m.id === action.payload.memberId);
        if (member) {
          member.role = action.payload.role as any;
        }
      })
      // Leave Organization
      .addCase(leaveOrganization.fulfilled, (state) => {
        state.currentOrganization = null;
        state.members = [];
        state.invitations = [];
      });
  },
});

export const { clearError, clearCurrentOrganization } = organizationSlice.actions;
export default organizationSlice.reducer;