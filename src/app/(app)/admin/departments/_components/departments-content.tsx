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
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Plus, Edit, ShieldAlert, Power, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

interface DepartmentRow {
  id: string;
  name: string;
  code: string;
  active: boolean;
  createdAt: string;
}

interface DepartmentsContentProps {
  user: { id: string; name: string; email: string; role: string };
}

export function DepartmentsContent({ user }: DepartmentsContentProps) {
  const [departments, setDepartments] = useState<DepartmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [showToggleDialog, setShowToggleDialog] = useState(false);
  const [editingDept, setEditingDept] = useState<DepartmentRow | null>(null);
  const [deptToToggle, setDeptToToggle] = useState<DepartmentRow | null>(null);
  const [search, setSearch] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    code: '',
  });

  useEffect(() => {
    fetchDepartments();
  }, []);

  const fetchDepartments = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/departments');
      if (res.ok) {
        const data = await res.json();
        setDepartments(data.departments || []);
      }
    } catch (error) {
      toast.error('Failed to load departments');
    } finally {
      setLoading(false);
    }
  };

  const filteredDepartments = departments.filter((d) =>
    d.name.toLowerCase().includes(search.toLowerCase()) ||
    d.code.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreate = async () => {
    try {
      const res = await fetch('/api/departments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        const newDept = await res.json();
        setDepartments((prev) => [newDept, ...prev]);
        toast.success('Department created');
        setShowDialog(false);
        resetForm();
      } else {
        const error = await res.json();
        toast.error(error.error || 'Failed to create department');
      }
    } catch {
      toast.error('Failed to create department');
    }
  };

  const handleUpdate = async () => {
    if (!editingDept) return;

    try {
      const res = await fetch(`/api/departments/${editingDept.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        const updated = await res.json();
        setDepartments((prev) => prev.map((d) => (d.id === editingDept.id ? updated : d)));
        toast.success('Department updated');
        setShowDialog(false);
        setEditingDept(null);
      } else {
        const error = await res.json();
        toast.error(error.error || 'Failed to update department');
      }
    } catch {
      toast.error('Failed to update department');
    }
  };

  const handleToggleActive = async (targetDept: DepartmentRow) => {
    try {
      const res = await fetch(`/api/departments/${targetDept.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !targetDept.active }),
      });
      if (res.ok) {
        const updated = await res.json();
        setDepartments((prev) => prev.map((d) => (d.id === targetDept.id ? updated : d)));
        toast.success(`Department ${updated.active ? 'activated' : 'deactivated'}`);
      } else {
        const error = await res.json();
        toast.error(error.error || 'Failed to update department');
      }
    } catch {
      toast.error('Failed to update department');
    } finally {
      setShowToggleDialog(false);
      setDeptToToggle(null);
    }
  };

  const openCreateDialog = () => {
    setEditingDept(null);
    resetForm();
    setShowDialog(true);
  };

  const openEditDialog = (targetDept: DepartmentRow) => {
    setEditingDept(targetDept);
    setFormData({ name: targetDept.name, code: targetDept.code });
    setShowDialog(true);
  };

  const resetForm = () => {
    setFormData({ name: '', code: '' });
  };

  return (
    <div className="flex-1">
      <main className="max-w-7xl mx-auto w-full py-6 px-4 lg:px-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Department Management</h1>
            <p className="text-muted-foreground">
              Create, edit, and activate/deactivate departments
            </p>
          </div>
          <Button onClick={openCreateDialog}>
            <Plus className="h-4 w-4 mr-2" />
            New Department
          </Button>
        </div>

        <div className="relative mb-4">
          <ShieldAlert className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search departments..."
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
        ) : filteredDepartments.length > 0 ? (
          <div className="space-y-2">
            {filteredDepartments.map((d) => (
              <Card key={d.id}>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex flex-col">
                        <h3 className="font-medium">{d.name}</h3>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Badge variant="outline">{d.code}</Badge>
                          {d.active ? (
                            <Badge variant="success" className="text-xs">Active</Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs">Inactive</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => openEditDialog(d)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          setDeptToToggle(d);
                          setShowToggleDialog(true);
                        }}
                      >
                        {d.active ? (
                          <>
                            <Power className="h-4 w-4" />
                            Deactivate
                          </>
                        ) : (
                          <>
                            <Power className="h-4 w-4" />
                            Activate
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <p>No departments found</p>
            <Button variant="link" onClick={openCreateDialog}>
              Create first department
            </Button>
          </div>
        )}

        {/* Create/Edit Dialog */}
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingDept ? 'Edit Department' : 'New Department'}</DialogTitle>
              <DialogDescription>
                {editingDept ? 'Update department details' : 'Create a new department'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Department Name</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g. Liaisoning & Approvals"
                />
              </div>
              <div>
                <Label>Department Code</Label>
                <Input
                  value={formData.code}
                  onChange={(e) => setFormData((prev) => ({ ...prev, code: e.target.value.toUpperCase() }))}
                  placeholder="e.g. LIA"
                  maxLength={10}
                />
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
              <Button onClick={editingDept ? handleUpdate : handleCreate}>
                {editingDept ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Activate/Deactivate Confirmation */}
        <Dialog open={showToggleDialog} onOpenChange={setShowToggleDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{deptToToggle?.active ? 'Deactivate Department' : 'Activate Department'}</DialogTitle>
              <DialogDescription>
                {deptToToggle?.active
                  ? `Are you sure you want to deactivate "${deptToToggle?.name}"? Users in this department will lose access until they are reassigned.`
                  : `Are you sure you want to activate "${deptToToggle?.name}"?`}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
              <Button variant="destructive" onClick={() => deptToToggle && handleToggleActive(deptToToggle)}>
                {deptToToggle?.active ? 'Deactivate' : 'Activate'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
