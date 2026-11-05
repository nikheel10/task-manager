'use client';

import { useState, useEffect, useCallback } from 'react';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Plus, Edit, Trash2, User, ShieldAlert, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { formatDateTime } from '@/lib/utils';

const ROLES: { value: string; label: string }[] = [
  { value: 'SUPER_ADMIN', label: 'Super Admin' },
  { value: 'MANAGER', label: 'Manager' },
  { value: 'TEAM_MEMBER', label: 'Team Member' },
  { value: 'VIEWER', label: 'Viewer' },
];

interface UserRow {
  id: string;
  name?: string | null;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
}

interface AdminUsersContentProps {
  user: { id: string; name: string; email: string; role: string };
}

export function AdminUsersContent({ user }: AdminUsersContentProps) {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editingUser, setEditingUser] = useState<UserRow | null>(null);
  const [userToDelete, setUserToDelete] = useState<UserRow | null>(null);
  const [search, setSearch] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'TEAM_MEMBER' as string,
    isActive: true,
    password: '',
  });

  const currentUserId = user.id;

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/users');
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
      }
    } catch (error) {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter((u) =>
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    (u.name && u.name.toLowerCase().includes(search.toLowerCase()))
  );

  const handleCreate = async () => {
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        const newUser = await res.json();
        setUsers((prev) => [newUser, ...prev]);
        toast.success('User created');
        setShowDialog(false);
        resetForm();
      } else {
        const error = await res.json();
        toast.error(error.error || 'Failed to create user');
      }
    } catch {
      toast.error('Failed to create user');
    }
  };

  const handleUpdate = async () => {
    if (!editingUser) return;

    try {
      const res = await fetch(`/api/admin/users/${editingUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        const updated = await res.json();
        setUsers((prev) => prev.map((u) => (u.id === editingUser.id ? updated : u)));
        toast.success('User updated');
        setShowDialog(false);
        setEditingUser(null);
      } else {
        const error = await res.json();
        toast.error(error.error || 'Failed to update user');
      }
    } catch {
      toast.error('Failed to update user');
    }
  };

  const handleDelete = async (targetUser: UserRow) => {
    try {
      const res = await fetch(`/api/admin/users/${targetUser.id}`, { method: 'DELETE' });
      if (res.ok) {
        setUsers((prev) => prev.filter((u) => u.id !== targetUser.id));
        toast.success('User deactivated');
      } else {
        const error = await res.json();
        toast.error(error.error || 'Failed to deactivate user');
      }
    } catch {
      toast.error('Failed to deactivate user');
    } finally {
      setShowDeleteDialog(false);
      setUserToDelete(null);
    }
  };

  const openCreateDialog = () => {
    setEditingUser(null);
    resetForm();
    setShowDialog(true);
  };

  const openEditDialog = (targetUser: UserRow) => {
    setEditingUser(targetUser);
    setFormData({
      name: targetUser.name || '',
      email: targetUser.email,
      role: targetUser.role,
      isActive: targetUser.isActive,
      password: '',
    });
    setShowDialog(true);
  };

  const resetForm = () => {
    setFormData({ name: '', email: '', role: 'TEAM_MEMBER', isActive: true, password: '' });
  };

  const canSelfEdit = (targetUserId: string) => targetUserId === currentUserId;

  return (
    <div className="flex-1">
            <main className="max-w-7xl mx-auto w-full py-6 px-4 lg:px-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
            <p className="text-muted-foreground">
              Manage users, roles, and account status
            </p>
          </div>
          <Button onClick={openCreateDialog}>
            <Plus className="h-4 w-4 mr-2" />
            New User
          </Button>
        </div>

        <div className="relative mb-4">
          <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {loading ? (
          <div className="space-y-2">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-16 bg-muted rounded animate-pulse" />
            ))}
          </div>
        ) : filteredUsers.length > 0 ? (
          <div className="space-y-2">
            {filteredUsers.map((u) => (
              <Card key={u.id}>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex flex-col">
                        <h3 className="font-medium">{u.name || u.email}</h3>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Badge variant={u.role === 'SUPER_ADMIN' ? 'destructive' : u.role === 'MANAGER' ? 'secondary' : 'outline'}>
                            {u.role}
                          </Badge>
                          {!u.isActive && <Badge variant="secondary" className="text-xs">Inactive</Badge>}
                          {u.email && <span>{u.email}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      {!canSelfEdit(u.id) && (
                        <Button variant="ghost" size="sm" onClick={() => openEditDialog(u)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                      )}
                      {!canSelfEdit(u.id) && u.isActive && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => {
                            setUserToDelete(u);
                            setShowDeleteDialog(true);
                          }}
                        >
                          <ShieldAlert className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <p>No users found</p>
            <Button variant="link" onClick={openCreateDialog}>
              Create first user
            </Button>
          </div>
        )}

        {/* Create/Edit Dialog */}
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingUser ? 'Edit User' : 'New User'}</DialogTitle>
              <DialogDescription>
                {editingUser ? 'Update user details' : 'Create a new user account'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Full Name</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                />
              </div>
              <div>
                <Label>Role</Label>
                <Select
                  value={formData.role}
                  onValueChange={(v) => setFormData((prev) => ({ ...prev, role: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.map((r) => (
                      <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {!editingUser && (
                <div>
                  <Label>Password</Label>
                  <Input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData((prev) => ({ ...prev, password: e.target.value }))}
                    placeholder="Leave empty for default"
                  />
                </div>
              )}
              <div className="flex items-center gap-2">
                <Checkbox
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, isActive: !!checked }))}
                />
                <Label htmlFor="isActive">Active</Label>
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
              <Button onClick={editingUser ? handleUpdate : handleCreate}>
                {editingUser ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Deactivate Confirmation */}
        <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Deactivate User</DialogTitle>
              <DialogDescription>
                Are you sure you want to deactivate "{userToDelete?.name || userToDelete?.email}"?
                This will prevent them from logging in.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
              <Button variant="destructive" onClick={() => userToDelete && handleDelete(userToDelete)}>
                Deactivate
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}


