'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from '@/components/ui/dialog';
import { Plus, Edit, ShieldAlert, UserPlus, User, Clock, Mail, Lock, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import { formatDateTime } from '@/lib/utils';

interface TeamMember {
  id: string;
  name?: string | null;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  employeeId: string | null;
  departmentId: string | null;
}

interface TeamMembersContentProps {
  user: { id: string; name: string; email: string; role: string; departmentId: string | null };
}

export function TeamMembersContent({ user }: TeamMembersContentProps) {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [showDeactivateDialog, setShowDeactivateDialog] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [memberToDeactivate, setMemberToDeactivate] = useState<TeamMember | null>(null);
  const [search, setSearch] = useState('');
  const [viewFilter, setViewFilter] = useState<'all' | 'active' | 'inactive'>('all');

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    isActive: true,
  });

  const currentUserId = user.id;
  const isManager = user.role === 'MANAGER';
  const isGlobal = user.role === 'SUPER_ADMIN' || user.role === 'MD';

  useEffect(() => {
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/team-members');
      if (res.ok) {
        const data = await res.json();
        setMembers(data.users || []);
      } else {
        toast.error('Failed to load team members');
      }
    } catch (error) {
      toast.error('Failed to load team members');
    } finally {
      setLoading(false);
    }
  };

  const filteredMembers = members.filter((m) => {
    const matchesSearch =
      m.email.toLowerCase().includes(search.toLowerCase()) ||
      (m.name && m.name.toLowerCase().includes(search.toLowerCase())) ||
      (m.employeeId && m.employeeId.toLowerCase().includes(search.toLowerCase()));

    if (viewFilter === 'active') return matchesSearch && m.isActive;
    if (viewFilter === 'inactive') return matchesSearch && !m.isActive;
    return matchesSearch;
  });

  const handleCreate = async () => {
    try {
      const res = await fetch('/api/team-members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        const newMember = await res.json();
        setMembers((prev) => [newMember, ...prev]);
        toast.success('Team member added');
        setShowDialog(false);
        resetForm();
      } else {
        const error = await res.json();
        toast.error(error.error || 'Failed to add team member');
      }
    } catch {
      toast.error('Failed to add team member');
    }
  };

  const handleUpdate = async () => {
    if (!editingMember) return;

    try {
      const res = await fetch(`/api/team-members/${editingMember.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        const updated = await res.json();
        setMembers((prev) => prev.map((m) => (m.id === editingMember.id ? updated : m)));
        toast.success('Team member updated');
        setShowDialog(false);
        setEditingMember(null);
      } else {
        const error = await res.json();
        toast.error(error.error || 'Failed to update team member');
      }
    } catch {
      toast.error('Failed to update team member');
    }
  };

  const handleDeactivate = async (targetMember: TeamMember) => {
    try {
      const res = await fetch(`/api/team-members/${targetMember.id}`, { method: 'DELETE' });
      if (res.ok) {
        setMembers((prev) => prev.filter((m) => m.id !== targetMember.id));
        toast.success('Team member deactivated');
      } else {
        const error = await res.json();
        toast.error(error.error || 'Failed to deactivate team member');
      }
    } catch {
      toast.error('Failed to deactivate team member');
    } finally {
      setShowDeactivateDialog(false);
      setMemberToDeactivate(null);
    }
  };

  const openCreateDialog = () => {
    setEditingMember(null);
    resetForm();
    setShowDialog(true);
  };

  const openEditDialog = (targetMember: TeamMember) => {
    setEditingMember(targetMember);
    setFormData({
      name: targetMember.name || '',
      email: targetMember.email,
      password: '',
      isActive: targetMember.isActive,
    });
    setShowDialog(true);
  };

  const resetForm = () => {
    setFormData({ name: '', email: '', password: '', isActive: true });
  };

  const canSelfEdit = (targetUserId: string) => targetUserId === currentUserId;

  return (
    <div className="flex-1">
      <main className="max-w-7xl mx-auto w-full py-6 px-4 lg:px-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Team Members</h1>
            <p className="text-muted-foreground">
              Manage your department's team members — add, edit, activate, or deactivate.
            </p>
          </div>
          <Button onClick={openCreateDialog}>
            <UserPlus className="h-4 w-4 mr-2" />
            Add Team Member
          </Button>
        </div>

        <div className="relative mb-4">
          <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, or employee ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex gap-2 mb-6">
          <Button variant={viewFilter === 'all' ? 'default' : 'outline'} size="sm" onClick={() => setViewFilter('all')}>
            All
          </Button>
          <Button variant={viewFilter === 'active' ? 'default' : 'outline'} size="sm" onClick={() => setViewFilter('active')}>
            Active
          </Button>
          <Button variant={viewFilter === 'inactive' ? 'default' : 'outline'} size="sm" onClick={() => setViewFilter('inactive')}>
            Inactive
          </Button>
        </div>

        {loading ? (
          <div className="space-y-2">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-16 bg-muted rounded animate-pulse" />
            ))}
          </div>
        ) : filteredMembers.length > 0 ? (
          <div className="space-y-2">
            {filteredMembers.map((m) => (
              <Card key={m.id}>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex flex-col">
                        <h3 className="font-medium">{m.name || m.email}</h3>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Badge variant={m.role === 'MANAGER' ? 'secondary' : 'outline'}>{m.role}</Badge>
                          {!m.isActive && <Badge variant="secondary" className="text-xs">Inactive</Badge>}
                          {m.email && <span>{m.email}</span>}
                          {m.employeeId && <span>{m.employeeId}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      {!canSelfEdit(m.id) && (
                        <Button variant="ghost" size="sm" onClick={() => openEditDialog(m)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                      )}
                      {!canSelfEdit(m.id) && m.isActive && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => {
                            setMemberToDeactivate(m);
                            setShowDeactivateDialog(true);
                          }}
                        >
                          <ShieldAlert className="h-4 w-4" />
                        </Button>
                      )}
                      {!canSelfEdit(m.id) && !m.isActive && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditDialog(m)}
                        >
                          <User className="h-4 w-4" />
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
            <Clock className="h-8 w-8 mb-3 opacity-50 mx-auto" />
            <p>No team members found</p>
            {viewFilter !== 'all' && <p className="text-xs mt-2">Try switching to "All" view.</p>}
          </div>
        )}
      </main>

      {/* Add/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingMember ? 'Edit Team Member' : 'Add Team Member'}</DialogTitle>
            <DialogDescription>
              {editingMember ? 'Update team member details and status.' : 'Add a new team member to your department.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); editingMember ? handleUpdate() : handleCreate(); }} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                placeholder="John Doe"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                disabled={loading}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="john@company.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                disabled={loading}
                required
              />
            </div>

            {!editingMember && (
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  disabled={loading}
                  required
                />
                <p className="text-xs text-muted-foreground">Minimum 8 characters</p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="isActive">Status</Label>
              <select
                id="isActive"
                value={formData.isActive ? 'true' : 'false'}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.value === 'true' })}
                disabled={loading}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDialog(false)} disabled={loading}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? <span>Saving...</span> : editingMember ? 'Update Member' : 'Add Member'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Deactivate Confirm Dialog */}
      <Dialog open={showDeactivateDialog} onOpenChange={setShowDeactivateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deactivate Team Member</DialogTitle>
            <DialogDescription>
              Deactivate <strong>{memberToDeactivate?.name || ''}</strong>? They will no longer be able to log in.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeactivateDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => handleDeactivate(memberToDeactivate!)} disabled={loading}>
              Deactivate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
