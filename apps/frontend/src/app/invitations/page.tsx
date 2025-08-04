'use client';

import { useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAppDispatch, useAppSelector } from '@/lib/redux/hooks';
import { fetchMyInvitations, acceptInvitation } from '@/lib/redux/features/organizationSlice';
import { useToast } from '@/components/ui/toast';
import { Mail, Clock, Building2, Check, X } from 'lucide-react';

export default function InvitationsPage() {
  const dispatch = useAppDispatch();
  const { myInvitations, isLoading, error } = useAppSelector((state) => state.organization);
  const { success, error: errorToast } = useToast();

  useEffect(() => {
    dispatch(fetchMyInvitations());
  }, [dispatch]);

  const handleAcceptInvitation = async (invitationId: number) => {
    try {
      await dispatch(acceptInvitation(invitationId)).unwrap();
      success('Invitation Accepted', 'You have successfully joined the organization!');
      // Refresh invitations list
      dispatch(fetchMyInvitations());
    } catch (error) {
      const message = typeof error === 'string' ? error : 'Failed to accept invitation';
      errorToast('Failed to Accept', message);
    }
  };

  return (
      <DashboardLayout requireAuth={true}>
      <div className="p-6">
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">My Invitations</h2>
          <p className="text-muted-foreground">
            View and manage your organization invitations
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Pending Invitations
              {myInvitations.length > 0 && (
                <span className="bg-primary text-primary-foreground text-xs px-2 py-1 rounded-full">
                  {myInvitations.length}
                </span>
              )}
            </CardTitle>
            <CardDescription>
              Organization invitations waiting for your response
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">
                <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading invitations...</p>
              </div>
            ) : myInvitations.length === 0 ? (
              <div className="text-center py-8">
                <Mail className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No invitations</h3>
                <p className="text-muted-foreground">
                  You don&apos;t have any pending organization invitations at the moment.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {myInvitations.map((invitation) => (
                  <div key={invitation.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium mb-1">
                          {invitation.organization?.name || 'Organization'}
                        </h4>
                        <p className="text-sm text-muted-foreground mb-2">
                          You&apos;ve been invited to join as a <span className="font-medium">{invitation.role}</span>
                        </p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Expires: {new Date(invitation.expires_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          onClick={() => handleAcceptInvitation(invitation.id)}
                          disabled={isLoading}
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Accept
                        </Button>
                        <Button size="sm" variant="outline" disabled={isLoading}>
                          <X className="h-4 w-4 mr-1" />
                          Decline
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {error && (
              <div className="mt-4 p-3 rounded-md bg-red-50 border border-red-200">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                How Invitations Work
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Building2 className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <h4 className="font-medium">Organization Invitations</h4>
                    <p className="text-sm text-muted-foreground">
                      Organizers can invite you to join their organization as a team member
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Mail className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <h4 className="font-medium">Email Notifications</h4>
                    <p className="text-sm text-muted-foreground">
                      You&apos;ll receive email notifications when invited to organizations
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Clock className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <h4 className="font-medium">Expiration</h4>
                    <p className="text-sm text-muted-foreground">
                      Invitations expire after 7 days if not accepted
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        </div>
      </DashboardLayout>
  );
}