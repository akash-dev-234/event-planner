'use client';

import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Shield, User, Mail, Calendar, Check, X } from 'lucide-react';
import { useReduxToast } from '@/hooks/useReduxToast';
import { apiClient } from '@/lib/api';

interface OrganizerRequest {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  created_at: string;
  role: string;
}

export default function OrganizerRequestsPage() {
  const [requests, setRequests] = useState<OrganizerRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<number | null>(null);
  const toast = useReduxToast();

  const fetchRequests = useCallback(async () => {
    try {
      const response = await apiClient.getOrganizerRequests();
      setRequests(response.requests || []);
    } catch (error: unknown) {
      console.error('Failed to fetch organizer requests:', error);
      const errorMessage = error instanceof Error ? error.message : "Failed to load organizer requests";
      toast.error("Error", errorMessage);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);


  const handleApprove = async (userId: number) => {
    setProcessing(userId);
    try {
      const response = await apiClient.approveOrganizerRequest(userId);
      toast.success("Request Approved", response.message);
      // Remove the approved request from the list
      setRequests(requests.filter(req => req.id !== userId));
    } catch (error: unknown) {
      console.error('Failed to approve request:', error);
      const errorMessage = error instanceof Error ? error.message : "Failed to approve request";
      toast.error("Error", errorMessage);
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (userId: number) => {
    setProcessing(userId);
    try {
      const response = await apiClient.rejectOrganizerRequest(userId);
      toast.success("Request Rejected", response.message);
      // Remove the rejected request from the list
      setRequests(requests.filter(req => req.id !== userId));
    } catch (error: unknown) {
      console.error('Failed to reject request:', error);
      const errorMessage = error instanceof Error ? error.message : "Failed to reject request";
      toast.error("Error", errorMessage);
    } finally {
      setProcessing(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <DashboardLayout requireAuth={true} requireRole="admin">
      <div className="p-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3">
            <Shield className="h-8 w-8 text-primary" />
            <div>
              <h2 className="text-3xl font-bold">Organizer Requests</h2>
              <p className="text-muted-foreground">
                Review and approve organizer role requests
              </p>
            </div>
          </div>
        </div>

        {/* Summary Card */}
        <div className="mb-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Pending Requests Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div>
                  <div className="text-2xl font-bold">{requests.length}</div>
                  <p className="text-sm text-muted-foreground">Pending Requests</p>
                </div>
                {requests.length > 0 && (
                  <Badge variant="secondary">
                    Requires Action
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Requests List */}
        {loading ? (
          <div className="text-center py-8">
            <p>Loading organizer requests...</p>
          </div>
        ) : requests.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Pending Requests</h3>
              <p className="text-muted-foreground">
                There are currently no organizer role requests awaiting approval.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {requests.map((request) => (
              <Card key={request.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <User className="h-5 w-5" />
                        {request.first_name} {request.last_name}
                      </CardTitle>
                      <CardDescription className="flex items-center gap-4 mt-2">
                        <span className="flex items-center gap-1">
                          <Mail className="h-4 w-4" />
                          {request.email}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {formatDate(request.created_at)}
                        </span>
                      </CardDescription>
                    </div>
                    <Badge variant="outline">
                      {request.role} → organizer
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                      <p>User ID: {request.id}</p>
                      <p>Current Role: {request.role}</p>
                      <p>Requested Role: organizer</p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleReject(request.id)}
                        disabled={processing === request.id}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <X className="h-4 w-4 mr-1" />
                        Reject
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleApprove(request.id)}
                        disabled={processing === request.id}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <Check className="h-4 w-4 mr-1" />
                        Approve
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Info Card */}
        <div className="mt-8">
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-primary">
                <Shield className="h-5 w-5" />
                About Organizer Requests
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="text-sm">When you approve an organizer request:</p>
                <ul className="text-sm space-y-1 ml-4">
                  <li>• The user&apos;s role will be upgraded from guest to organizer</li>
                  <li>• They will be able to create and manage organizations</li>
                  <li>• They will receive an email notification about the approval</li>
                  <li>• The request will be removed from this list</li>
                </ul>
                <p className="text-sm mt-4">When you reject a request:</p>
                <ul className="text-sm space-y-1 ml-4">
                  <li>• The user will remain in their current role</li>
                  <li>• They will receive an email notification about the rejection</li>
                  <li>• The request will be removed from this list</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}