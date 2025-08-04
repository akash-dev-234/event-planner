'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useReduxAuth } from '@/hooks/useReduxAuth';
import { useToast } from '@/components/ui/toast';
import { useAppDispatch, useAppSelector } from '@/lib/redux/hooks';
import { createOrganization } from '@/lib/redux/features/organizationSlice';
import { createOrganizationSchema, CreateOrganizationFormData } from '@/lib/validations/auth';
import { Building2, ArrowLeft, Users } from 'lucide-react';
import Link from 'next/link';

export default function CreateOrganizationPage() {
  const { user, isAuthenticated } = useReduxAuth();
  const { success, error: errorToast } = useToast();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { isCreating, error } = useAppSelector((state) => state.organization);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CreateOrganizationFormData>({
    resolver: zodResolver(createOrganizationSchema),
    defaultValues: {
      name: '',
      description: '',
    },
  });

  // Redirect if not authenticated or not an organizer
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    if (user?.role !== 'organizer' && user?.role !== 'admin') {
      router.push('/dashboard');
      return;
    }

    if (user?.organization_id && user?.role !== 'admin') {
      router.push('/dashboard');
      return;
    }
  }, [isAuthenticated, user, router]);

  // Show loading or return null while redirecting
  if (!isAuthenticated || (user?.role !== 'organizer' && user?.role !== 'admin') || (user?.organization_id && user?.role !== 'admin')) {
    return null;
  }

  const onSubmit = async (data: CreateOrganizationFormData) => {
    try {
      const result = await dispatch(createOrganization({
        name: data.name,
        description: data.description || undefined,
      })).unwrap();

      success('Organization Created', `${result.name} has been created successfully!`);
      router.push('/dashboard');
    } catch (error) {
      const message = typeof error === 'string' ? error : 'Failed to create organization';
      errorToast('Creation Failed', message);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Dashboard
              </Button>
            </Link>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-sm">EP</span>
              </div>
              <h1 className="text-xl font-semibold">Create Organization</h1>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <Building2 className="h-8 w-8 text-primary" />
              <div>
                <h2 className="text-3xl font-bold">Create Your Organization</h2>
                <p className="text-muted-foreground">
                  Set up your organization to start managing events and team members
                </p>
              </div>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Organization Details
              </CardTitle>
              <CardDescription>
                Provide basic information about your organization. You can update these details later.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="name">Organization Name *</Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="Enter organization name"
                    className={errors.name ? 'border-red-500 focus:border-red-500' : ''}
                    {...register('name')}
                  />
                  {errors.name && (
                    <p className="text-sm text-red-600">{errors.name.message}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Choose a unique name that represents your organization
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description (Optional)</Label>
                  <textarea
                    id="description"
                    rows={4}
                    placeholder="Tell us about your organization..."
                    className={`flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none ${
                      errors.description ? 'border-red-500 focus:border-red-500' : ''
                    }`}
                    {...register('description')}
                  />
                  {errors.description && (
                    <p className="text-sm text-red-600">{errors.description.message}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Describe your organization&apos;s purpose, mission, or activities
                  </p>
                </div>

                {error && (
                  <div className="p-3 rounded-md bg-red-50 border border-red-200">
                    <p className="text-sm text-red-600">{error}</p>
                  </div>
                )}

                <div className="flex gap-4">
                  <Button
                    type="submit"
                    disabled={isCreating || isSubmitting}
                    className="flex-1"
                  >
                    {(isCreating || isSubmitting) ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-primary-foreground/20 border-t-primary-foreground rounded-full animate-spin"></div>
                        Creating...
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4" />
                        Create Organization
                      </div>
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.push('/dashboard')}
                    disabled={isCreating || isSubmitting}
                  >
                    Cancel
                  </Button>
                </div>

                <div className="p-4 rounded-md bg-blue-50 border border-blue-200">
                  <h4 className="text-sm font-medium text-blue-900 mb-2">What happens next?</h4>
                  <ul className="text-xs text-blue-700 space-y-1">
                    <li>• You&apos;ll become the organization admin automatically</li>
                    <li>• You can invite team members and assign roles</li>
                    <li>• Start creating and managing events for your organization</li>
                    <li>• Access organization-specific features and analytics</li>
                  </ul>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}