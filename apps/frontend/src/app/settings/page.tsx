'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useReduxAuth } from '@/hooks/useReduxAuth';
import { apiClient } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { User, Bell, Shield, Trash2, Loader2 } from 'lucide-react';

export default function SettingsPage() {
  const { user, logout } = useReduxAuth();
  const router = useRouter();

  // Profile form state
  const [firstName, setFirstName] = useState(user?.first_name || '');
  const [lastName, setLastName] = useState(user?.last_name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileMessage, setProfileMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Password form state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Delete account state
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteMessage, setDeleteMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Update profile form values when user changes
  useEffect(() => {
    if (user) {
      setFirstName(user.first_name || '');
      setLastName(user.last_name || '');
      setEmail(user.email || '');
    }
  }, [user]);

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileLoading(true);
    setProfileMessage(null);

    // Trim whitespace
    const trimmedFirstName = firstName.trim();
    const trimmedLastName = lastName.trim();
    const trimmedEmail = email.trim();

    // Validate required fields
    if (!trimmedFirstName) {
      setProfileMessage({ type: 'error', text: 'First name is required' });
      setProfileLoading(false);
      return;
    }
    if (!trimmedLastName) {
      setProfileMessage({ type: 'error', text: 'Last name is required' });
      setProfileLoading(false);
      return;
    }
    if (!trimmedEmail) {
      setProfileMessage({ type: 'error', text: 'Email is required' });
      setProfileLoading(false);
      return;
    }

    try {
      const response = await apiClient.updateProfile({
        first_name: trimmedFirstName,
        last_name: trimmedLastName,
        email: trimmedEmail,
      });

      setProfileMessage({ type: 'success', text: response.message });

      // Update local form state with returned user data
      if (response.user) {
        setFirstName(response.user.first_name);
        setLastName(response.user.last_name);
        setEmail(response.user.email);
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update profile';
      setProfileMessage({ type: 'error', text: errorMessage });
    } finally {
      setProfileLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordLoading(true);
    setPasswordMessage(null);

    // Trim whitespace from passwords
    const trimmedCurrentPassword = currentPassword.trim();
    const trimmedNewPassword = newPassword.trim();
    const trimmedConfirmPassword = confirmPassword.trim();

    // Validate required fields
    if (!trimmedCurrentPassword) {
      setPasswordMessage({ type: 'error', text: 'Current password is required' });
      setPasswordLoading(false);
      return;
    }
    if (!trimmedNewPassword) {
      setPasswordMessage({ type: 'error', text: 'New password is required' });
      setPasswordLoading(false);
      return;
    }
    if (!trimmedConfirmPassword) {
      setPasswordMessage({ type: 'error', text: 'Please confirm your new password' });
      setPasswordLoading(false);
      return;
    }

    // Validate passwords match
    if (trimmedNewPassword !== trimmedConfirmPassword) {
      setPasswordMessage({ type: 'error', text: 'New passwords do not match' });
      setPasswordLoading(false);
      return;
    }

    try {
      const response = await apiClient.changePassword(trimmedCurrentPassword, trimmedNewPassword);
      setPasswordMessage({ type: 'success', text: response.message });

      // Clear form
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to change password';
      setPasswordMessage({ type: 'error', text: errorMessage });
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    const trimmedPassword = deletePassword.trim();

    if (!trimmedPassword) {
      setDeleteMessage({ type: 'error', text: 'Please enter your password to confirm deletion' });
      return;
    }

    setDeleteLoading(true);
    setDeleteMessage(null);

    try {
      await apiClient.deleteAccount(trimmedPassword);

      // Logout and redirect
      logout();
      router.push('/login?deleted=true');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete account';
      setDeleteMessage({ type: 'error', text: errorMessage });
      setDeleteLoading(false);
    }
  };

  return (
    <DashboardLayout requireAuth={true}>
      <div className="p-6">
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">Settings</h2>
          <p className="text-muted-foreground">
            Manage your account settings and preferences
          </p>
        </div>

        <div className="space-y-6">
          {/* Profile Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Profile Information
              </CardTitle>
              <CardDescription>
                Update your personal information and profile details
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleProfileUpdate} className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="Enter your first name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Enter your last name"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Current Role</Label>
                  <Input
                    id="role"
                    value={user?.role || ''}
                    disabled
                    className="bg-muted"
                  />
                  <p className="text-xs text-muted-foreground">
                    Contact an administrator to change your role
                  </p>
                </div>
                {profileMessage && (
                  <p className={`text-sm ${profileMessage.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                    {profileMessage.text}
                  </p>
                )}
                <Button type="submit" disabled={profileLoading}>
                  {profileLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Changes
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Notification Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notification Preferences
              </CardTitle>
              <CardDescription>
                Choose how you want to receive notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Email Notifications</h4>
                  <p className="text-sm text-muted-foreground">
                    Receive notifications via email
                  </p>
                </div>
                <input type="checkbox" defaultChecked className="h-4 w-4" />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Event Reminders</h4>
                  <p className="text-sm text-muted-foreground">
                    Get reminded about upcoming events
                  </p>
                </div>
                <input type="checkbox" defaultChecked className="h-4 w-4" />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Organization Updates</h4>
                  <p className="text-sm text-muted-foreground">
                    Receive updates from your organization
                  </p>
                </div>
                <input type="checkbox" defaultChecked className="h-4 w-4" />
              </div>
              <p className="text-xs text-muted-foreground">
                Notification preferences are coming soon.
              </p>
            </CardContent>
          </Card>

          {/* Security Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Security
              </CardTitle>
              <CardDescription>
                Manage your account security settings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePasswordChange} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">Current Password</Label>
                  <Input
                    id="currentPassword"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter your current password"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter your new password"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm your new password"
                    required
                  />
                </div>
                {passwordMessage && (
                  <p className={`text-sm ${passwordMessage.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                    {passwordMessage.text}
                  </p>
                )}
                <Button type="submit" disabled={passwordLoading}>
                  {passwordLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Change Password
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Danger Zone */}
          <Card className="border-red-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600">
                <Trash2 className="h-5 w-5" />
                Danger Zone
              </CardTitle>
              <CardDescription>
                Irreversible actions that affect your account
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!showDeleteConfirm ? (
                <div className="flex items-center justify-between p-4 border border-red-200 rounded-lg">
                  <div>
                    <h4 className="font-medium text-red-600">Delete Account</h4>
                    <p className="text-sm text-muted-foreground">
                      Permanently delete your account and all associated data
                    </p>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setShowDeleteConfirm(true)}
                  >
                    Delete Account
                  </Button>
                </div>
              ) : (
                <div className="p-4 border border-red-200 rounded-lg space-y-4">
                  <div>
                    <h4 className="font-medium text-red-600">Confirm Account Deletion</h4>
                    <p className="text-sm text-muted-foreground">
                      This action cannot be undone. Enter your password to confirm.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="deletePassword">Password</Label>
                    <Input
                      id="deletePassword"
                      type="password"
                      value={deletePassword}
                      onChange={(e) => setDeletePassword(e.target.value)}
                      placeholder="Enter your password to confirm"
                    />
                  </div>
                  {deleteMessage && (
                    <p className={`text-sm ${deleteMessage.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                      {deleteMessage.text}
                    </p>
                  )}
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setShowDeleteConfirm(false);
                        setDeletePassword('');
                        setDeleteMessage(null);
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleDeleteAccount}
                      disabled={deleteLoading}
                    >
                      {deleteLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Delete My Account
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
