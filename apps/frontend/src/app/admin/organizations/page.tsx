'use client';

import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useReduxAuth } from '@/hooks/useReduxAuth';
import { apiClient, Organization } from '@/lib/api';
import { Building2, Trash2, RotateCcw, Loader2, Users, Calendar } from 'lucide-react';

type FilterType = 'all' | 'active' | 'deleted';

export default function AdminOrganizationsPage() {
  const { user } = useReduxAuth();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>('all');

  // Action states
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  const fetchOrganizations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.getOrganizations(filter);
      setOrganizations(response.organizations || []);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load organizations';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchOrganizations();
  }, [fetchOrganizations]);

  const handleDelete = async (orgId: number) => {
    setActionLoading(orgId);
    try {
      await apiClient.adminDeleteOrganization(orgId, true);
      setDeleteConfirm(null);
      await fetchOrganizations();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete organization';
      alert(errorMessage);
    } finally {
      setActionLoading(null);
    }
  };

  const handleRestore = async (orgId: number) => {
    setActionLoading(orgId);
    try {
      await apiClient.adminRestoreOrganization(orgId);
      await fetchOrganizations();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to restore organization';
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

  const activeCount = organizations.filter(o => !o.is_deleted).length;
  const deletedCount = organizations.filter(o => o.is_deleted).length;

  return (
    <DashboardLayout requireAuth={true}>
      <div className="p-6">
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2 flex items-center gap-2">
            <Building2 className="h-8 w-8" />
            Organization Management
          </h2>
          <p className="text-muted-foreground">
            View and manage all organizations in the system
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Organizations ({organizations.length})</CardTitle>
            <CardDescription>
              Filter, view, and manage organization accounts
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Filter Tabs */}
            <div className="flex gap-2 mb-6">
              <Button
                variant={filter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('all')}
              >
                All
              </Button>
              <Button
                variant={filter === 'active' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('active')}
              >
                Active ({filter === 'all' ? activeCount : filter === 'active' ? organizations.length : activeCount})
              </Button>
              <Button
                variant={filter === 'deleted' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('deleted')}
              >
                Deleted ({filter === 'all' ? deletedCount : filter === 'deleted' ? organizations.length : deletedCount})
              </Button>
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
            ) : organizations.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                No organizations found
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-medium">Organization</th>
                      <th className="text-left py-3 px-4 font-medium">Members</th>
                      <th className="text-left py-3 px-4 font-medium">Status</th>
                      <th className="text-left py-3 px-4 font-medium">Created</th>
                      <th className="text-right py-3 px-4 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {organizations.map((org) => (
                      <tr key={org.id} className="border-b hover:bg-muted/50">
                        <td className="py-3 px-4">
                          <div>
                            <p className="font-medium">{org.name}</p>
                            {org.description && (
                              <p className="text-sm text-muted-foreground line-clamp-1">
                                {org.description}
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1 text-sm">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            {org.member_count || 0}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          {org.is_deleted ? (
                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              Deleted
                            </span>
                          ) : (
                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              Active
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {org.created_at
                              ? new Date(org.created_at).toLocaleDateString()
                              : '-'}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-end gap-2">
                            {org.is_deleted ? (
                              // Restore button for deleted orgs
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleRestore(org.id)}
                                disabled={actionLoading === org.id}
                                className="text-green-600 hover:text-green-700 hover:bg-green-50"
                              >
                                {actionLoading === org.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <>
                                    <RotateCcw className="h-4 w-4 mr-1" />
                                    Restore
                                  </>
                                )}
                              </Button>
                            ) : (
                              // Delete button for active orgs
                              deleteConfirm === org.id ? (
                                <div className="flex items-center gap-1">
                                  <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => handleDelete(org.id)}
                                    disabled={actionLoading === org.id}
                                  >
                                    {actionLoading === org.id ? (
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
                                  onClick={() => setDeleteConfirm(org.id)}
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                >
                                  <Trash2 className="h-4 w-4 mr-1" />
                                  Delete
                                </Button>
                              )
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
