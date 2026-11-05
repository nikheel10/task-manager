'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useTheme } from 'next-themes';
import { toast } from 'sonner';
import { hasPermission, Role } from '@/lib/permissions';

interface SettingsContentProps {
  user: { id: string; name: string; email: string; role: string };
}

export function SettingsContent({ user }: SettingsContentProps) {
  const [name, setName] = useState(user.name || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [emailNotifications, setEmailNotifications] = useState<boolean>(true);
  const [desktopNotifications, setDesktopNotifications] = useState<boolean>(true);
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system');
  const { setTheme: setNextTheme } = useTheme();

  const userRole = user.role as Role;
  const canEditProfile = hasPermission(userRole, 'settings.edit_profile');
  const canChangePassword = hasPermission(userRole, 'settings.change_password');

  useEffect(() => {
    setNextTheme(theme);
  }, [theme, setNextTheme]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/settings/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      if (res.ok) {
        toast.success('Profile updated');
      } else {
        const error = await res.json();
        toast.error(error.error || 'Failed to update profile');
      }
    } catch {
      toast.error('Failed to update profile');
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error('All password fields are required');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    try {
      const res = await fetch('/api/settings/password', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      if (res.ok) {
        toast.success('Password changed successfully');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        const error = await res.json();
        toast.error(error.error || 'Failed to change password');
      }
    } catch {
      toast.error('Failed to change password');
    }
  };

  const handleThemeChange = (value: string) => {
    setTheme(value as 'light' | 'dark' | 'system');
  };

  const handleNotificationToggle = (key: string, checked: boolean) => {
    if (key === 'email') setEmailNotifications(checked);
    if (key === 'desktop') setDesktopNotifications(checked);
  };

  return (
    <div className="flex-1">
            <main className="max-w-7xl mx-auto w-full py-6 px-4 lg:px-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <Badge variant="outline">{user.role}</Badge>
        </div>

        <div className="space-y-6">
          {/* Profile */}
          <Card>
            <CardHeader>
              <CardTitle>Profile</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="flex flex-col">
                    <Label>Full Name</Label>
                    <Input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      disabled={!canEditProfile}
                    />
                    {!canEditProfile && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Profile editing not available for your role
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col">
                    <Label>Email</Label>
                    <Input value={user.email} disabled readOnly />
                  </div>
                  <div className="flex flex-col">
                    <Label>Role</Label>
                    <Input value={user.role} disabled readOnly />
                  </div>
                </div>
                <Button type="submit" disabled={!canEditProfile}>
                  Save Profile
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Password */}
          <Card>
            <CardHeader>
              <CardTitle>Change Password</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleChangePassword} className="space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="flex flex-col">
                    <Label>Current Password</Label>
                    <Input
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      disabled={!canChangePassword}
                    />
                  </div>
                  <div className="flex flex-col">
                    <Label>New Password</Label>
                    <Input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      disabled={!canChangePassword}
                    />
                  </div>
                  <div className="flex flex-col">
                    <Label>Confirm Password</Label>
                    <Input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      disabled={!canChangePassword}
                    />
                  </div>
                </div>
                {!canChangePassword && (
                  <p className="text-xs text-muted-foreground">
                    Password change not available for your role
                  </p>
                )}
                <Button type="submit" disabled={!canChangePassword}>
                  Change Password
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Theme & Notifications */}
          <Card>
            <CardHeader>
              <CardTitle>Preferences</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex flex-col">
                  <Label>Theme</Label>
                  <Select value={theme} onValueChange={handleThemeChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="system">System</SelectItem>
                      <SelectItem value="light">Light</SelectItem>
                      <SelectItem value="dark">Dark</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="border-t pt-4">
                  <h3 className="text-sm font-medium mb-3">Notifications</h3>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="emailNotifications"
                      checked={emailNotifications as unknown as boolean}
                      onCheckedChange={(checked) => handleNotificationToggle('email', checked as boolean)}
                    />
                    <Label htmlFor="emailNotifications">Email notifications</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="desktopNotifications"
                      checked={desktopNotifications as unknown as boolean}
                      onCheckedChange={(checked) => handleNotificationToggle('desktop', checked as boolean)}
                    />
                    <Label htmlFor="desktopNotifications">Desktop notifications</Label>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}


