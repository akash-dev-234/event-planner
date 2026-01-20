'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useReduxAuth } from '@/hooks/useReduxAuth';
import { useReduxToast } from '@/hooks/useReduxToast';
import { useAppDispatch, useAppSelector } from '@/lib/redux/hooks';
import { fetchOrganization, fetchOrganizationMembers, leaveOrganization } from '@/lib/redux/features/organizationSlice';
import DashboardLayout from '@/components/DashboardLayout';
import { 
  Users, 
  UserPlus, 
  Crown, 
  User, 
  Mail,
  Calendar,
  Building2,
  Edit3,
  LogOut,
  Trash2,
  MoreHorizontal,
  UserX,
  Shield
} from 'lucide-react';
import { OrganizationMember, apiClient } from '@/lib/api';

export default function OrganizationPage() {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<number | null>(null);
  const [processingMember, setProcessingMember] = useState<number | null>(null);
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);
  const [showRoleDialog, setShowRoleDialog] = useState(false);
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedMember, setSelectedMember] = useState<{id: number, name: string, role: string} | null>(null);

  const router = useRouter();
  const dispatch = useAppDispatch();
  const { user } = useReduxAuth();
  const { success, error: errorToast } = useReduxToast();
  
  const { currentOrganization, members, isLoading: orgLoading } = useAppSelector(
    (state) => state.organization
  );

  useEffect(() => {
    if (user?.organization_id) {
      dispatch(fetchOrganization(user.organization_id));
      dispatch(fetchOrganizationMembers(user.organization_id));
    }
  }, [dispatch, user?.organization_id]);

  useEffect(() => {
    if (currentOrganization) {
      setEditName(currentOrganization.name);
      setEditDescription(currentOrganization.description || '');
    }
  }, [currentOrganization]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setActiveDropdown(null);
    if (activeDropdown) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [activeDropdown]);

  // Member management functions
  const handleRemoveMember = async () => {
    if (!currentOrganization || !selectedMember) return;

    setShowRemoveDialog(false);
    setProcessingMember(selectedMember.id);
    try {
      await apiClient.removeOrganizationMember(currentOrganization.id, selectedMember.id);
      success('Member Removed', `${selectedMember.name} has been removed from the organization.`);
      // Refresh members list
      dispatch(fetchOrganizationMembers(currentOrganization.id));
    } catch (error: any) {
      errorToast('Failed to Remove Member', error.message || 'An error occurred');
    } finally {
      setProcessingMember(null);
      setActiveDropdown(null);
      setSelectedMember(null);
    }
  };

  const handleChangeRole = async () => {
    if (!currentOrganization || !selectedMember) return;

    const newRole = selectedMember.role === 'team_member' ? 'organizer' : 'team_member';
    const roleText = newRole === 'organizer' ? 'an organizer' : 'a team member';
    
    setShowRoleDialog(false);
    setProcessingMember(selectedMember.id);
    try {
      await apiClient.changeMemberRole(currentOrganization.id, selectedMember.id, newRole);
      success('Role Changed', `${selectedMember.name} is now ${roleText}.`);
      // Refresh members list
      dispatch(fetchOrganizationMembers(currentOrganization.id));
    } catch (error: any) {
      errorToast('Failed to Change Role', error.message || 'An error occurred');
    } finally {
      setProcessingMember(null);
      setActiveDropdown(null);
      setSelectedMember(null);
    }
  };

  if (!user) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p>Please log in to view organization details.</p>
        </div>
      </DashboardLayout>
    );
  }

  if (!user.organization_id) {
    return (
      <DashboardLayout>
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader className="text-center">
              <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <CardTitle>No Organization</CardTitle>
              <CardDescription>
                You&apos;re not a member of any organization yet.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              {user.role === 'organizer' ? (
                <>
                  <p className="text-sm text-muted-foreground">
                    As an organizer, you can create your own organization or wait for an invitation.
                  </p>
                  <Button onClick={() => router.push('/organizations/create')}>
                    Create Organization
                  </Button>
                </>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">
                    Wait for an organizer to invite you to their organization.
                  </p>
                  <Button onClick={() => router.push('/invitations')}>
                    Check Invitations
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  const handleUpdateOrganization = async () => {
    if (!currentOrganization || !editName.trim()) return;

    setIsLoading(true);
    try {
      await apiClient.updateOrganization(currentOrganization.id, {
        name: editName.trim(),
        description: editDescription.trim() || undefined,
      });
      // Refresh organization data
      dispatch(fetchOrganization(currentOrganization.id));
      setIsEditing(false);
      success('Organization Updated', 'Organization details have been updated successfully.');
    } catch (error: any) {
      errorToast('Update Failed', error.message || 'Failed to update organization details.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteOrganization = async () => {
    if (!currentOrganization) return;

    setIsDeleting(true);
    try {
      await apiClient.deleteOrganization(currentOrganization.id);
      setShowDeleteDialog(false);
      success('Organization Deleted', 'The organization has been deleted successfully.');
      router.push('/dashboard');
    } catch (error: any) {
      errorToast('Delete Failed', error.message || 'Failed to delete organization.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleLeaveOrganization = async () => {
    setShowLeaveDialog(false);
    try {
      await dispatch(leaveOrganization()).unwrap();
      success('Left Organization', 'You have successfully left the organization.');
      router.push('/dashboard');
    } catch (error) {
      errorToast('Leave Failed', error as string || 'Failed to leave organization.');
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'organizer':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
      case 'team_member':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'guest':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'organizer':
        return <Crown className="h-4 w-4" />;
      case 'team_member':
        return <User className="h-4 w-4" />;
      case 'guest':
        return <User className="h-4 w-4" />;
      default:
        return <User className="h-4 w-4" />;
    }
  };

  const currentUserMember = members.find(member => member.id === user.id);
  const isOrganizer = currentUserMember?.role === 'organizer';

  if (orgLoading || !currentOrganization) {
    return (
      <DashboardLayout>
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <div className="h-64 bg-gray-200 rounded"></div>
              </div>
              <div className="h-64 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Organization</h1>
            <p className="text-muted-foreground">
              Manage your organization and team members
            </p>
          </div>
          {isOrganizer && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push('/organizations/invitations')}
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Manage Invitations
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(!isEditing)}
              >
                <Edit3 className="h-4 w-4 mr-2" />
                {isEditing ? 'Cancel' : 'Edit'}
              </Button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Organization Details */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Organization Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {isEditing ? (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Organization Name</Label>
                      <Input
                        id="name"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        placeholder="Enter organization name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description">Description</Label>
                      <Input
                        id="description"
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        placeholder="Enter organization description (optional)"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        onClick={handleUpdateOrganization}
                        disabled={isLoading || !editName.trim()}
                      >
                        {isLoading ? 'Saving...' : 'Save Changes'}
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={() => setIsEditing(false)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-xl font-semibold">{currentOrganization.name}</h3>
                      <p className="text-muted-foreground">
                        {currentOrganization.description || 'No description provided'}
                      </p>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        Created {new Date(currentOrganization.created_at).toLocaleDateString()}
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        {members.length} member{members.length !== 1 ? 's' : ''}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Members List */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Team Members ({members.length})
                  </CardTitle>
                  {isOrganizer && (
                    <Button size="sm" onClick={() => router.push('/organizations/invitations')}>
                      <UserPlus className="h-4 w-4 mr-2" />
                      Invite Member
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {members.map((member: OrganizationMember) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                          {getRoleIcon(member.role)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">
                              {member.first_name} {member.last_name}
                            </span>
                            {member.is_current_user && (
                              <span className="text-xs text-muted-foreground">(You)</span>
                            )}
                          </div>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Mail className="h-3 w-3" />
                            {member.email}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={getRoleBadgeColor(member.role)}>
                          {member.role.replace('_', ' ')}
                        </Badge>
                        {isOrganizer && !member.is_current_user && (
                          <div className="relative">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => setActiveDropdown(activeDropdown === member.id ? null : member.id)}
                              disabled={processingMember === member.id}
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                            
                            {activeDropdown === member.id && (
                              <div className="absolute right-0 mt-1 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-10">
                                <div className="py-1">
                                  <button
                                    onClick={() => {
                                      setSelectedMember({id: member.id, name: `${member.first_name} ${member.last_name}`, role: member.role});
                                      setShowRoleDialog(true);
                                      setActiveDropdown(null);
                                    }}
                                    disabled={processingMember === member.id}
                                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50"
                                  >
                                    <Shield className="h-4 w-4 mr-2" />
                                    {member.role === 'team_member' ? 'Make Organizer' : 'Make Team Member'}
                                  </button>
                                  <button
                                    onClick={() => {
                                      setSelectedMember({id: member.id, name: `${member.first_name} ${member.last_name}`, role: member.role});
                                      setShowRemoveDialog(true);
                                      setActiveDropdown(null);
                                    }}
                                    disabled={processingMember === member.id}
                                    className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
                                  >
                                    <UserX className="h-4 w-4 mr-2" />
                                    Remove Member
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Stats */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Total Members</span>
                  <span className="font-semibold">{members.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Organizers</span>
                  <span className="font-semibold">
                    {members.filter(m => m.role === 'organizer').length}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Team Members</span>
                  <span className="font-semibold">
                    {members.filter(m => m.role === 'team_member').length}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Your Role */}
            <Card>
              <CardHeader>
                <CardTitle>Your Role</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                    {getRoleIcon(currentUserMember?.role || 'guest')}
                  </div>
                  <div>
                    <div className="font-medium">{user.first_name} {user.last_name}</div>
                    <Badge className={getRoleBadgeColor(currentUserMember?.role || 'guest')}>
                      {currentUserMember?.role?.replace('_', ' ') || 'guest'}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => router.push('/events')}
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  View Events
                </Button>
                
                {isOrganizer && (
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    onClick={() => router.push('/events/create')}
                  >
                    <Calendar className="h-4 w-4 mr-2" />
                    Create Event
                  </Button>
                )}
                
                <Button 
                  variant="outline" 
                  className="w-full justify-start text-orange-600 hover:text-orange-700"
                  onClick={() => setShowLeaveDialog(true)}
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Leave Organization
                </Button>

                {isOrganizer && (
                  <Button
                    variant="outline"
                    className="w-full justify-start text-red-600 hover:text-red-700"
                    onClick={() => setShowDeleteDialog(true)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Organization
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
        
        {/* Remove Member Dialog */}
        <Dialog open={showRemoveDialog} onOpenChange={setShowRemoveDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-600">
                <UserX className="h-5 w-5" />
                Remove Member
              </DialogTitle>
              <DialogDescription>
                Are you sure you want to remove {selectedMember?.name} from the organization?
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2">
              <Button 
                variant="outline" 
                onClick={() => setShowRemoveDialog(false)}
                disabled={processingMember === selectedMember?.id}
              >
                Cancel
              </Button>
              <Button 
                variant="destructive"
                onClick={handleRemoveMember}
                disabled={processingMember === selectedMember?.id}
              >
                {processingMember === selectedMember?.id ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin mr-2"></div>
                    Removing...
                  </>
                ) : (
                  <>
                    <UserX className="h-4 w-4 mr-2" />
                    Remove Member
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Change Role Dialog */}
        <Dialog open={showRoleDialog} onOpenChange={setShowRoleDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Change Member Role
              </DialogTitle>
              <DialogDescription>
                {selectedMember && (
                  `Are you sure you want to make ${selectedMember.name} ${selectedMember.role === 'team_member' ? 'an organizer' : 'a team member'}?`
                )}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2">
              <Button 
                variant="outline" 
                onClick={() => setShowRoleDialog(false)}
                disabled={processingMember === selectedMember?.id}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleChangeRole}
                disabled={processingMember === selectedMember?.id}
              >
                {processingMember === selectedMember?.id ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin mr-2"></div>
                    Changing...
                  </>
                ) : (
                  <>
                    <Shield className="h-4 w-4 mr-2" />
                    Change Role
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Leave Organization Dialog */}
        <Dialog open={showLeaveDialog} onOpenChange={setShowLeaveDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-orange-600">
                <LogOut className="h-5 w-5" />
                Leave Organization
              </DialogTitle>
              <DialogDescription>
                Are you sure you want to leave this organization? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => setShowLeaveDialog(false)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleLeaveOrganization}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Leave Organization
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Organization Dialog */}
        <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-600">
                <Trash2 className="h-5 w-5" />
                Delete Organization
              </DialogTitle>
              <DialogDescription>
                Are you sure you want to delete <strong>{currentOrganization?.name}</strong>? This will remove all members from the organization. This action cannot be undone.
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
              <Button
                variant="destructive"
                onClick={handleDeleteOrganization}
                disabled={isDeleting}
              >
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