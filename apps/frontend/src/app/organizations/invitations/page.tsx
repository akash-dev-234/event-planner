'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useReduxAuth } from '@/hooks/useReduxAuth';
import { useReduxToast } from '@/hooks/useReduxToast';
import { useAppDispatch, useAppSelector } from '@/lib/redux/hooks';
import { inviteUserToOrganization } from '@/lib/redux/features/organizationSlice';
import { inviteUserSchema, InviteUserFormData } from '@/lib/validations/auth';
import DashboardLayout from '@/components/DashboardLayout';
import { 
  Mail, 
  UserPlus, 
  Clock, 
  Send,
  ArrowLeft,
  Users,
  Calendar,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';
import { apiClient, Invitation } from '@/lib/api';

export default function OrganizationInvitationsPage() {
  const [pendingInvitations, setPendingInvitations] = useState<Invitation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingInvitations, setIsLoadingInvitations] = useState(false);

  const router = useRouter();
  const dispatch = useAppDispatch();
  const { user } = useReduxAuth();
  const { success, error: errorToast } = useReduxToast();

  const { isInviting } = useAppSelector(
    (state) => state.organization
  );

  // For admins, get organization ID from URL parameter
  const searchParams = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
  const orgIdParam = searchParams.get('orgId');
  const organizationId = user?.role === 'admin' && orgIdParam ? parseInt(orgIdParam) : user?.organization_id;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<InviteUserFormData>({
    resolver: zodResolver(inviteUserSchema),
    defaultValues: {
      email: '',
      role: 'team_member',
    },
  });

  const loadPendingInvitations = async () => {
    if (!organizationId) return;

    setIsLoadingInvitations(true);
    try {
      const response = await apiClient.getOrganizationInvitations(organizationId);
      setPendingInvitations(response.invitations || []);
    } catch (error) {
      console.error('Failed to load invitations:', error);
      errorToast('Load Failed', 'Failed to load pending invitations.');
    } finally {
      setIsLoadingInvitations(false);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (organizationId) {
      loadPendingInvitations();
    } else {
      setIsLoading(false);
    }
  }, [organizationId]);

  if (!user) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p>Please log in to manage invitations.</p>
        </div>
      </DashboardLayout>
    );
  }

  if (user.role !== 'organizer' && user.role !== 'admin') {
    return (
      <DashboardLayout>
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader className="text-center">
              <AlertTriangle className="h-12 w-12 mx-auto text-yellow-500 mb-4" />
              <CardTitle>Access Denied</CardTitle>
              <CardDescription>
                Only organizers and admins can manage organization invitations.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Button onClick={() => router.push('/organizations')}>
                Back to Organization
              </Button>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  if (!organizationId) {
    return (
      <DashboardLayout>
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader className="text-center">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <CardTitle>No Organization</CardTitle>
              <CardDescription>
                {user?.role === 'admin'
                  ? 'Please select an organization from the admin panel to manage invitations.'
                  : 'You need to create or join an organization first.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Button onClick={() => router.push(user?.role === 'admin' ? '/admin/organizations' : '/organizations/create')}>
                {user?.role === 'admin' ? 'View Organizations' : 'Create Organization'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  const onSubmit = async (data: InviteUserFormData) => {
    if (!organizationId) return;

    try {
      await dispatch(inviteUserToOrganization({
        orgId: organizationId,
        data
      })).unwrap();
      
      success('Invitation Sent!', `Invitation sent to ${data.email}`);
      reset();
      // Reload invitations to show the new one
      loadPendingInvitations();
    } catch (error) {
      errorToast('Invitation Failed', error as string || 'Failed to send invitation.');
    }
  };

  const getTimeRemaining = (expiresAt: string) => {
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diff = expiry.getTime() - now.getTime();
    
    if (diff <= 0) return 'Expired';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days} day${days !== 1 ? 's' : ''} left`;
    if (hours > 0) return `${hours} hour${hours !== 1 ? 's' : ''} left`;
    return 'Less than 1 hour left';
  };

  const getStatusBadge = (expiresAt: string) => {
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diff = expiry.getTime() - now.getTime();
    
    if (diff <= 0) {
      return <Badge variant="destructive">Expired</Badge>;
    }
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours < 24) {
      return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Expiring Soon</Badge>;
    }
    
    return <Badge variant="secondary" className="bg-green-100 text-green-800">Active</Badge>;
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="h-64 bg-gray-200 rounded"></div>
              <div className="h-64 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/organizations')}
                className="p-0"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Manage Invitations</h1>
            <p className="text-muted-foreground">
              Invite new members and manage pending invitations
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Send New Invitation */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5" />
                Send New Invitation
              </CardTitle>
              <CardDescription>
                Invite someone to join your organization
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="Enter email address"
                      className={`pl-10 ${errors.email ? 'border-red-500' : ''}`}
                      {...register('email')}
                    />
                  </div>
                  {errors.email && (
                    <p className="text-sm text-red-600">{errors.email.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <select
                    id="role"
                    className={`w-full px-3 py-2 border border-input bg-background rounded-md text-sm ${errors.role ? 'border-red-500' : ''}`}
                    {...register('role')}
                  >
                    <option value="team_member">Team Member</option>
                  </select>
                  {errors.role && (
                    <p className="text-sm text-red-600">{errors.role.message}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    💡 To invite guests to events, create an event and invite them there instead.
                  </p>
                </div>

                <Button type="submit" className="w-full" disabled={isInviting}>
                  {isInviting ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-primary-foreground/20 border-t-primary-foreground rounded-full animate-spin"></div>
                      Sending invitation...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Send className="h-4 w-4" />
                      Send Invitation
                    </div>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Pending Invitations */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Pending Invitations ({pendingInvitations.length})
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={loadPendingInvitations}
                  disabled={isLoadingInvitations}
                >
                  {isLoadingInvitations ? 'Refreshing...' : 'Refresh'}
                </Button>
              </div>
              <CardDescription>
                Track invitation status and expiration
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingInvitations ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="animate-pulse">
                      <div className="h-16 bg-gray-200 rounded"></div>
                    </div>
                  ))}
                </div>
              ) : pendingInvitations.length === 0 ? (
                <div className="text-center py-8">
                  <Mail className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No pending invitations</p>
                  <p className="text-sm text-muted-foreground">
                    Send your first invitation using the form on the left
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingInvitations.map((invitation) => (
                    <div
                      key={invitation.id}
                      className="p-4 border rounded-lg space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{invitation.email}</span>
                        </div>
                        {getStatusBadge(invitation.expires_at)}
                      </div>
                      
                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <div className="flex items-center gap-4">
                          <span>Role: <strong className="text-foreground">{invitation.role.replace('_', ' ')}</strong></span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {getTimeRemaining(invitation.expires_at)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Information Card */}
        <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-900 dark:text-blue-100">
              <CheckCircle className="h-5 w-5" />
              How Invitations Work
            </CardTitle>
          </CardHeader>
          <CardContent className="text-blue-800 dark:text-blue-200 space-y-2">
            <ul className="space-y-1 text-sm">
              <li>• Invitations are sent via email to the specified address</li>
              <li>• Recipients have 7 days to accept the invitation</li>
              <li>• If the email is not registered, they&apos;ll need to sign up first</li>
              <li>• Team members can create events and participate in organization activities</li>
              <li>• Guests have limited access to organization features</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}