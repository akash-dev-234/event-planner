'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { apiClient, Organization, OrganizationMember } from '@/lib/api';
import { useReduxToast } from '@/hooks/useReduxToast';
import { useReduxAuth } from '@/hooks/useReduxAuth';
import {
  ArrowLeft,
  Building2,
  Users,
  Calendar,
  Edit,
  Trash2,
  UserPlus,
  Mail,
  Shield,
  User,
} from 'lucide-react';
import Link from 'next/link';

const ROLE_LABELS: Record<string, { label: string; color: string }> = {
  admin: { label: 'Admin', color: 'bg-red-100 text-red-700' },
  organizer: { label: 'Organizer', color: 'bg-purple-100 text-purple-700' },
  team_member: { label: 'Team Member', color: 'bg-blue-100 text-blue-700' },
  guest: { label: 'Guest', color: 'bg-gray-100 text-gray-700' },
};

export default function OrganizationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { error: errorToast, success } = useReduxToast();
  const { user } = useReduxAuth();

  const [organization, setOrganization] = useState<Organization | null>(null);
  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const isAdmin = user?.role === 'admin';
  const isOrganizer = user?.role === 'organizer' && user?.organization_id === parseInt(id);
  const canEdit = isAdmin || isOrganizer;

  useEffect(() => {
    const fetchOrganizationDetails = async () => {
      try {
        setIsLoading(true);
        const [orgResponse, membersResponse] = await Promise.all([
          apiClient.getOrganization(parseInt(id)),
          apiClient.getOrganizationMembers(parseInt(id)),
        ]);
        setOrganization(orgResponse.organization);
        setMembers(membersResponse.members);
      } catch (error) {
        errorToast('Error', 'Failed to load organization details');
        console.error('Failed to fetch organization:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrganizationDetails();
  }, [id, errorToast]);

  const handleDelete = async () => {
    setShowDeleteDialog(false);
    setIsDeleting(true);
    try {
      await apiClient.deleteOrganization(parseInt(id));
      success('Organization Deleted', 'The organization has been deleted successfully.');
      router.push('/organizations');
    } catch (error) {
      errorToast('Delete Failed', error as string || 'Failed to delete organization.');
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout requireAuth={true}>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!organization) {
    return (
      <DashboardLayout requireAuth={true}>
        <div className="p-6">
          <Card>
            <CardContent className="text-center py-8">
              <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Organization Not Found</h3>
              <p className="text-muted-foreground mb-4">
                The organization you're looking for doesn't exist or you don't have permission to view it.
              </p>
              <Button onClick={() => router.push('/organizations')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Organizations
              </Button>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout requireAuth={true}>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => router.push('/organizations')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Organizations
          </Button>
        </div>

        {/* Organization Details Card */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Building2 className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-3xl mb-2">{organization.name}</CardTitle>
                  <CardDescription>
                    Created on {new Date(organization.created_at).toLocaleDateString()}
                  </CardDescription>
                </div>
              </div>
              {canEdit && (
                <div className="flex gap-2">
                  <Link href={`/organizations/${organization.id}/edit`}>
                    <Button variant="outline" size="sm">
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                  </Link>
                  {isAdmin && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowDeleteDialog(true)}
                      disabled={isDeleting}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      {isDeleting ? 'Deleting...' : 'Delete'}
                    </Button>
                  )}
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Description */}
            {organization.description && (
              <div>
                <h4 className="font-semibold mb-2">Description</h4>
                <p className="text-muted-foreground">{organization.description}</p>
              </div>
            )}

            {/* Stats */}
            <div className="grid md:grid-cols-3 gap-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="h-5 w-5 text-blue-700" />
                  <span className="text-sm font-medium text-blue-700">Members</span>
                </div>
                <p className="text-3xl font-bold text-blue-900">{members.length}</p>
              </div>

              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="h-5 w-5 text-purple-700" />
                  <span className="text-sm font-medium text-purple-700">Organizers</span>
                </div>
                <p className="text-3xl font-bold text-purple-900">
                  {members.filter((m) => m.role === 'organizer').length}
                </p>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="h-5 w-5 text-green-700" />
                  <span className="text-sm font-medium text-green-700">Active Since</span>
                </div>
                <p className="text-lg font-bold text-green-900">
                  {new Date(organization.created_at).toLocaleDateString('en-US', {
                    month: 'short',
                    year: 'numeric',
                  })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Members List */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Members ({members.length})
                </CardTitle>
                <CardDescription>People who are part of this organization</CardDescription>
              </div>
              {canEdit && (
                <Link href={`/organizations/invitations${isAdmin ? `?orgId=${id}` : ''}`}>
                  <Button size="sm">
                    <UserPlus className="h-4 w-4 mr-2" />
                    Invite Members
                  </Button>
                </Link>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {members.length > 0 ? (
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-muted">
                    <tr>
                      <th className="text-left p-3 font-medium">Member</th>
                      <th className="text-left p-3 font-medium">Email</th>
                      <th className="text-left p-3 font-medium">Role</th>
                      <th className="text-left p-3 font-medium">Joined</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {members.map((member) => (
                      <tr key={member.id} className="hover:bg-muted/50">
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                              <User className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium">
                                {member.first_name} {member.last_name}
                              </p>
                              {member.is_current_user && (
                                <span className="text-xs text-muted-foreground">(You)</span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="p-3 text-sm">{member.email}</td>
                        <td className="p-3">
                          <span
                            className={`text-xs px-2 py-1 rounded-full ${
                              ROLE_LABELS[member.role]?.color || 'bg-gray-100 text-gray-700'
                            }`}
                          >
                            {ROLE_LABELS[member.role]?.label || member.role}
                          </span>
                        </td>
                        <td className="p-3 text-sm text-muted-foreground">
                          {new Date(member.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 border border-dashed rounded-lg">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h4 className="font-medium mb-1">No Members Yet</h4>
                <p className="text-sm text-muted-foreground mb-4">
                  Start by inviting team members to join this organization.
                </p>
                {canEdit && (
                  <Link href="/organizations/invitations">
                    <Button>
                      <UserPlus className="h-4 w-4 mr-2" />
                      Invite Members
                    </Button>
                  </Link>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Delete Confirmation Dialog */}
        <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-600">
                <Trash2 className="h-5 w-5" />
                Delete Organization
              </DialogTitle>
              <DialogDescription>
                Are you sure you want to delete "{organization?.name}"? This action cannot be undone
                and will remove all associated data.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => setShowDeleteDialog(false)}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
                {isDeleting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin mr-2"></div>
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Organization
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
