'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle2, XCircle, UserPlus, Clock, Mail, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Registration {
  id: string;
  name: string;
  email: string;
  employeeId: string | null;
  role: string;
  status: string;
  departmentId: string | null;
  requestedAt: Date | string;
  rejectionReason: string | null;
  department: { id: string; name: string; code: string } | null;
}

interface RegistrationsContentProps {
  user: { id: string; role: string; departmentId: string | null; name: string };
  statusFilter: string;
}

export function RegistrationsContent({ user, statusFilter }: RegistrationsContentProps) {
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openDialog, setOpenDialog] = useState<{ id: string; name: string; action: 'approve' | 'reject' } | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadRegistrations();
  }, [user.id, statusFilter]);

  async function loadRegistrations() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/registrations?status=${encodeURIComponent(statusFilter)}`);
      if (!res.ok) {
        throw new Error('Failed to load requests');
      }
      const data = await res.json();
      setRegistrations(data.registrations || []);
    } catch {
      setError('Failed to load registration requests.');
    } finally {
      setLoading(false);
    }
  }

  async function handleAction(id: string, action: 'approve' | 'reject', reason?: string) {
    setSaving(true);
    try {
      const res = await fetch(`/api/registrations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, reason }),
      });
      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || 'Action failed');
      }
      setOpenDialog(null);
      setRejectReason('');
      await loadRegistrations();
    } catch (err: any) {
      setError(err.message || 'Action failed');
    } finally {
      setSaving(false);
    }
  }

  const isManager = user.role === 'MANAGER';
  const isGlobal = user.role === 'SUPER_ADMIN' || user.role === 'MD';

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading requests...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center">
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button variant="outline" onClick={loadRegistrations} className="mt-4">
          Try Again
        </Button>
      </div>
    );
  }

  const canAct = isManager || isGlobal;

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <CardHeader className="flex flex-row items-center justify-between gap-4 py-3">
            <div>
              <CardTitle className="text-lg font-semibold">Pending Registration Requests</CardTitle>
              <CardDescription>
                {isManager ? 'Review and approve registration requests from your department.' : 'Review and approve registration requests across all departments.'}
              </CardDescription>
            </div>
            <Badge variant={statusFilter === 'PENDING' ? 'default' : 'secondary'} className="h-9 px-3">
              {statusFilter} Requests
            </Badge>
          </CardHeader>
        </div>
      </div>

      <Card>
        <CardContent>
          {registrations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Clock className="h-8 w-8 mb-3 opacity-50" />
              <p className="text-sm">No {statusFilter.toLowerCase()} registration requests.</p>
              {statusFilter === 'PENDING' && (
                <p className="text-xs mt-2">All caught up! New requests will appear here.</p>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-3 font-medium">Employee</th>
                    <th className="pb-3 font-medium">Employee ID</th>
                    <th className="pb-3 font-medium">Email</th>
                    <th className="pb-3 font-medium">Department</th>
                    <th className="pb-3 font-medium">Requested</th>
                    <th className="pb-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {registrations.map((reg) => (
                    <tr key={reg.id} className="border-b hover:bg-muted/50">
                      <td className="py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                            <UserPlus className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="font-medium">{reg.name}</p>
                            <p className="text-xs text-muted-foreground capitalize">{reg.role}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4">
                        <code className="text-xs font-mono">{reg.employeeId || '—'}</code>
                      </td>
                      <td className="py-4">
                        <div className="flex items-center gap-2">
                          <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <p className="text-sm">{reg.email}</p>
                        </div>
                      </td>
                      <td className="py-4">
                        {reg.department ? (
                          <div className="flex items-center gap-2">
                            <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            <span className="text-sm">{reg.department.name}</span>
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">Global</span>
                        )}
                      </td>
                      <td className="py-4 text-sm text-muted-foreground">
                        {new Date(reg.requestedAt).toLocaleDateString()}
                      </td>
                      <td className="py-4 text-right">
                        {canAct ? (
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => setOpenDialog({ id: reg.id, name: reg.name, action: 'approve' })}
                              disabled={saving}
                            >
                              Approve
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setOpenDialog({ id: reg.id, name: reg.name, action: 'reject' });
                              }}
                              disabled={saving}
                            >
                              Reject
                            </Button>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">No access</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {statusFilter === 'PENDING' && (
        <Card>
          <CardHeader>
            <CardTitle>How it works</CardTitle>
            <CardDescription>
              Employees self-register with their details. As a manager, review each request and approve or reject it.
              Approved users can log in immediately; rejected users receive the reason and can re-apply.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start gap-3 text-sm">
              <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
              <p className="text-muted-foreground">Approving sets the user to ACTIVE and notifies them by email/notification.</p>
            </div>
            <div className="flex items-start gap-3 text-sm">
              <XCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
              <p className="text-muted-foreground">
                Rejecting requires a reason (min. 5 characters). The user is notified and can re-submit.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Approve Dialog */}
      <Dialog open={!!openDialog && openDialog.action === 'approve'} onOpenChange={(open) => { if (!open) setOpenDialog(null); }}>
        <DialogTrigger asChild>
          <Button variant="outline" onClick={() => setOpenDialog({ id: '', name: '', action: 'approve' })} style={{ display: 'none' }}>
            Approve
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Registration</DialogTitle>
            <DialogDescription>
              Approve <strong>{openDialog?.name || ''}</strong>'s registration request? They will be able to log in immediately.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenDialog(null)} disabled={saving}>
              Cancel
            </Button>
            <Button
              onClick={() => handleAction(openDialog!.id, 'approve')}
              disabled={saving}
            >
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : ''} Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={!!openDialog && openDialog.action === 'reject'} onOpenChange={(open) => { if (!open) setOpenDialog(null); }}>
        <DialogTrigger asChild>
          <Button variant="outline" onClick={() => setOpenDialog({ id: '', name: '', action: 'reject' })} style={{ display: 'none' }}>
            Reject
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Registration</DialogTitle>
            <DialogDescription>
              Reject <strong>{openDialog?.name || ''}</strong>'s registration request. A reason is required.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 p-6">
            <Label htmlFor="reject-reason">Reason for rejection</Label>
            <Input
              id="reject-reason"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g., Employee ID not found in our records..."
              disabled={saving}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenDialog(null)} disabled={saving}>
              Cancel
            </Button>
            <Button
              onClick={() => handleAction(openDialog!.id, 'reject', rejectReason.trim() || undefined)}
              disabled={saving || rejectReason.trim().length < 5}
            >
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : ''} Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
