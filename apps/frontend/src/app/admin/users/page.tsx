'use client';

import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useReduxAuth } from '@/hooks/useReduxAuth';
import { apiClient, Organization } from '@/lib/api';
import { Users, Search, ChevronLeft, ChevronRight, Trash2, Shield, Loader2, X } from 'lucide-react';

interface UserData {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  organization_id: number | null;
  organization_name: string | null;
  pending_organizer_approval: boolean;
  created_at: string;
}

interface RoleChangeModal {
  userId: number;
  userName: string;
  currentRole: string;
  newRole: string;
}

const ROLES = ['guest', 'team_member', 'organizer', 'admin'];

const getRoleBadgeColor = (role: string) => {
  switch (role) {
    case 'admin':
      return 'bg-red-100 text-red-800';
    case 'organizer':
      return 'bg-purple-100 text-purple-800';
    case 'team_member':
      return 'bg-blue-100 text-blue-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

export default function AdminUsersPage() {
  const { user } = useReduxAuth();
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const perPage = 10;

  // Search and filter
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [searchDebounce, setSearchDebounce] = useState('');

  // Action states
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  // Role change modal
  const [roleChangeModal, setRoleChangeModal] = useState<RoleChangeModal | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<number | null>(null);
  const [orgsLoading, setOrgsLoading] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.getAllUsers({
        page,
        per_page: perPage,
        search: searchDebounce,
        role: roleFilter,
      });
      setUsers(response.users);
      setTotalPages(response.total_pages);
      setTotalCount(response.total_count);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load users';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [page, perPage, searchDebounce, roleFilter]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchDebounce(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch organizations when modal opens for team_member or organizer roles
  useEffect(() => {
    if (roleChangeModal && (roleChangeModal.newRole === 'team_member' || roleChangeModal.newRole === 'organizer')) {
      setOrgsLoading(true);
      apiClient.getOrganizations('active')
        .then((response) => {
          setOrganizations(response.organizations || []);
        })
        .catch((err) => {
          console.error('Failed to load organizations:', err);
        })
        .finally(() => {
          setOrgsLoading(false);
        });
    }
  }, [roleChangeModal]);

  const handleRoleSelectChange = (userId: number, userName: string, currentRole: string, newRole: string) => {
    // If changing to team_member or organizer, show modal to select org
    if (newRole === 'team_member' || newRole === 'organizer') {
      setRoleChangeModal({ userId, userName, currentRole, newRole });
      setSelectedOrgId(null);
    } else {
      // For guest or admin, change directly
      handleRoleChange(userId, newRole);
    }
  };

  const handleRoleChange = async (userId: number, newRole: string, orgId?: number) => {
    setActionLoading(userId);
    try {
      await apiClient.changeUserRole(userId, newRole, orgId || undefined);
      setRoleChangeModal(null);
      setSelectedOrgId(null);
      await fetchUsers();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to change role';
      alert(errorMessage);
    } finally {
      setActionLoading(null);
    }
  };

  const handleConfirmRoleChange = async () => {
    if (!roleChangeModal) return;

    const { userId, newRole } = roleChangeModal;

    // For team_member, org is required
    if (newRole === 'team_member' && !selectedOrgId) {
      alert('Please select an organization for team member');
      return;
    }

    await handleRoleChange(userId, newRole, selectedOrgId || undefined);
  };

  const handleDeleteUser = async (userId: number) => {
    setActionLoading(userId);
    try {
      await apiClient.adminDeleteUser(userId);
      setDeleteConfirm(null);
      await fetchUsers();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete user';
      alert(errorMessage);
    } finally {
      setActionLoading(null);
    }
  };

  // Check if current user is admin
  if (user?.role !== 'admin') {
    return (
      <DashboardLayout requireAuth={true}>
        <div className="p-6">
          <Card>
            <CardContent className="p-6">
              <p className="text-center text-muted-foreground">
                Access denied. Admin privileges required.
              </p>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout requireAuth={true}>
      <div className="p-6">
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2 flex items-center gap-2">
            <Users className="h-8 w-8" />
            User Management
          </h2>
          <p className="text-muted-foreground">
            View and manage all users in the system
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Users ({totalCount})</CardTitle>
            <CardDescription>
              Search, filter, and manage user accounts
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Search and Filter */}
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <select
                value={roleFilter}
                onChange={(e) => {
                  setRoleFilter(e.target.value);
                  setPage(1);
                }}
                className="border rounded-md px-3 py-2 bg-background"
              >
                <option value="">All Roles</option>
                {ROLES.map((role) => (
                  <option key={role} value={role}>
                    {role.replace('_', ' ').charAt(0).toUpperCase() + role.replace('_', ' ').slice(1)}
                  </option>
                ))}
              </select>
            </div>

            {/* Error State */}
            {error && (
              <div className="p-4 mb-4 bg-red-50 text-red-600 rounded-lg">
                {error}
              </div>
            )}

            {/* Loading State */}
            {loading ? (
              <div className="flex justify-center items-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : users.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                No users found
              </div>
            ) : (
              <>
                {/* Users Table */}
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4 font-medium">User</th>
                        <th className="text-left py-3 px-4 font-medium">Role</th>
                        <th className="text-left py-3 px-4 font-medium">Organization</th>
                        <th className="text-left py-3 px-4 font-medium">Joined</th>
                        <th className="text-right py-3 px-4 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((userData) => (
                        <tr key={userData.id} className="border-b hover:bg-muted/50">
                          <td className="py-3 px-4">
                            <div>
                              <p className="font-medium">
                                {userData.first_name} {userData.last_name}
                              </p>
                              <p className="text-sm text-muted-foreground">{userData.email}</p>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleBadgeColor(userData.role)}`}>
                                {userData.role.replace('_', ' ')}
                              </span>
                              {userData.pending_organizer_approval && (
                                <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                  Pending
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            {userData.organization_name || (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-sm text-muted-foreground">
                            {userData.created_at
                              ? new Date(userData.created_at).toLocaleDateString()
                              : '-'}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center justify-end gap-2">
                              {/* Role Dropdown */}
                              {userData.id !== user?.id && (
                                <select
                                  value={userData.role}
                                  onChange={(e) => handleRoleSelectChange(
                                    userData.id,
                                    `${userData.first_name} ${userData.last_name}`,
                                    userData.role,
                                    e.target.value
                                  )}
                                  disabled={actionLoading === userData.id}
                                  className="border rounded px-2 py-1 text-sm bg-background"
                                >
                                  {ROLES.map((role) => (
                                    <option key={role} value={role}>
                                      {role.replace('_', ' ')}
                                    </option>
                                  ))}
                                </select>
                              )}

                              {/* Delete Button */}
                              {userData.id !== user?.id && (
                                deleteConfirm === userData.id ? (
                                  <div className="flex items-center gap-1">
                                    <Button
                                      variant="destructive"
                                      size="sm"
                                      onClick={() => handleDeleteUser(userData.id)}
                                      disabled={actionLoading === userData.id}
                                    >
                                      {actionLoading === userData.id ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                      ) : (
                                        'Confirm'
                                      )}
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => setDeleteConfirm(null)}
                                    >
                                      Cancel
                                    </Button>
                                  </div>
                                ) : (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setDeleteConfirm(userData.id)}
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                )
                              )}

                              {userData.id === user?.id && (
                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Shield className="h-3 w-3" /> You
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-6">
                    <p className="text-sm text-muted-foreground">
                      Page {page} of {totalPages}
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page === 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                      >
                        Next
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Role Change Modal */}
        {roleChangeModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-background rounded-lg p-6 w-full max-w-md mx-4 shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Change User Role</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setRoleChangeModal(null);
                    setSelectedOrgId(null);
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Changing <strong>{roleChangeModal.userName}</strong> from{' '}
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${getRoleBadgeColor(roleChangeModal.currentRole)}`}>
                    {roleChangeModal.currentRole.replace('_', ' ')}
                  </span>{' '}
                  to{' '}
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${getRoleBadgeColor(roleChangeModal.newRole)}`}>
                    {roleChangeModal.newRole.replace('_', ' ')}
                  </span>
                </p>

                <div className="space-y-2">
                  <Label htmlFor="organization">
                    {roleChangeModal.newRole === 'team_member'
                      ? 'Select Organization (Required)'
                      : 'Select Organization (Optional)'}
                  </Label>
                  {orgsLoading ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading organizations...
                    </div>
                  ) : (
                    <select
                      id="organization"
                      value={selectedOrgId || ''}
                      onChange={(e) => setSelectedOrgId(e.target.value ? parseInt(e.target.value) : null)}
                      className="w-full border rounded-md px-3 py-2 bg-background"
                    >
                      <option value="">
                        {roleChangeModal.newRole === 'team_member'
                          ? '-- Select an organization --'
                          : '-- No organization (can create own) --'}
                      </option>
                      {organizations.map((org) => (
                        <option key={org.id} value={org.id}>
                          {org.name}
                        </option>
                      ))}
                    </select>
                  )}
                  {roleChangeModal.newRole === 'organizer' && (
                    <p className="text-xs text-muted-foreground">
                      If no organization is selected, the user can create their own.
                    </p>
                  )}
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setRoleChangeModal(null);
                      setSelectedOrgId(null);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleConfirmRoleChange}
                    disabled={actionLoading === roleChangeModal.userId || (roleChangeModal.newRole === 'team_member' && !selectedOrgId)}
                  >
                    {actionLoading === roleChangeModal.userId ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : null}
                    Confirm Change
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
