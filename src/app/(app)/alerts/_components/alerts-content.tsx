'use client';

import { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Label } from '@/components/ui/label';
import {
  Search,
  Filter,
  X,
  AlertTriangle,
  UserCheck,
  Calendar,
  Clock,
  TrendingUp,
  Plus,
  MoreVertical,
} from 'lucide-react';
import Link from 'next/link';
import { cn, formatDate, formatRelativeTime } from '@/lib/utils';
import { toast } from 'sonner';
import { useSession } from 'next-auth/react';
import {
  Alert,
  AlertType,
  AlertStatus,
  Priority,
  EntityType,
  AlertsResponse,
  AlertStats,
  AlertEntityType,
  UserOption,
} from '../types';

const ALERT_TYPES: { value: AlertType; label: string }[] = [
  { value: 'REGULATORY', label: 'Regulatory' },
  { value: 'STATUTORY', label: 'Statutory' },
  { value: 'LICENSE_RENEWAL', label: 'License Renewal' },
  { value: 'CONTRACT_RENEWAL', label: 'Contract Renewal' },
  { value: 'INSURANCE', label: 'Insurance' },
  { value: 'INSPECTION', label: 'Inspection' },
  { value: 'COMPLIANCE_FILING', label: 'Compliance Filing' },
];

const ALERT_STATUSES: { value: AlertStatus; label: string }[] = [
  { value: 'OPEN', label: 'Open' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'SUBMITTED', label: 'Submitted' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'OVERDUE', label: 'Overdue' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

const PRIORITIES: { value: Priority; label: string; color: string }[] = [
  { value: 'LOW', label: 'Low', color: 'bg-blue-500' },
  { value: 'MEDIUM', label: 'Medium', color: 'bg-yellow-500' },
  { value: 'HIGH', label: 'High', color: 'bg-orange-500' },
  { value: 'URGENT', label: 'Urgent', color: 'bg-red-500' },
];

export interface AlertsContentProps {
  user: { id: string; name: string; email: string; role: string; departmentId: string | null; departmentHasGlobalAccess: boolean };
}

export function AlertsContent({ user }: AlertsContentProps) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [stats, setStats] = useState<AlertStats | null>(null);
  const [entities, setEntities] = useState<AlertEntityType[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [alertToDelete, setAlertToDelete] = useState<Alert | null>(null);

  const [filters, setFilters] = useState({
    search: '',
    type: 'all',
    status: 'all',
    priority: 'all',
    ownerId: 'all',
    entityId: 'all',
    dueFrom: '',
    dueTo: '',
    overdue: false,
  });

  const isGlobal = user.role === 'SUPER_ADMIN' || user.role === 'MD' || user.departmentHasGlobalAccess === true;
  const isManager = user.role === 'SUPER_ADMIN' || user.role === 'MANAGER';
  const canCreate = isManager;

  const fetchAlerts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.search) params.set('search', filters.search);
      if (filters.type && filters.type !== 'all') params.set('type', filters.type);
      if (filters.status && filters.status !== 'all') params.set('status', filters.status);
      if (filters.priority && filters.priority !== 'all') params.set('priority', filters.priority);
      if (filters.ownerId && filters.ownerId !== 'all') params.set('ownerId', filters.ownerId);
      if (filters.entityId && filters.entityId !== 'all') params.set('entityId', filters.entityId);
      if (filters.dueFrom) params.set('dueFrom', filters.dueFrom);
      if (filters.dueTo) params.set('dueTo', filters.dueTo);
      if (filters.overdue) params.set('overdue', 'true');
      params.set('page', '1');
      params.set('limit', '100');

      const res = await fetch(`/api/alerts?${params.toString()}`);
      if (res.ok) {
        const data: AlertsResponse = await res.json();
        setAlerts(data.alerts);
        if (data.alerts.length > 0 && !selectedAlert) {
          setSelectedAlert(data.alerts[0]);
        }
      }
    } catch (error) {
      toast.error('Failed to load alerts');
    } finally {
      setLoading(false);
    }
  }, [filters, selectedAlert]);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/alerts/stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Failed to load stats');
    }
  }, []);

  const fetchEntities = useCallback(async () => {
    try {
      const res = await fetch('/api/entities');
      if (res.ok) {
        const data = await res.json();
        setEntities(data.entities || data || []);
      }
    } catch (error) {
      console.error('Failed to load entities');
    }
  }, []);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    fetchEntities();
  }, [fetchEntities]);

  useEffect(() => {
    fetch('/api/users/eligible')
      .then((res) => res.json())
      .then((data) => setUsers(data))
      .catch(() => {});
  }, []);

  const handleFilterChange = (key: string, value: string | boolean) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const resetFilters = () => {
    setFilters({
      search: '',
      type: 'all',
      status: 'all',
      priority: 'all',
      ownerId: 'all',
      entityId: 'all',
      dueFrom: '',
      dueTo: '',
      overdue: false,
    });
  };

  const handleDeleteAlert = async (alert: Alert) => {
    try {
      const res = await fetch(`/api/alerts/${alert.id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        toast.success('Alert deleted');
        setAlerts((prev) => prev.filter((a) => a.id !== alert.id));
        if (selectedAlert?.id === alert.id) {
          setSelectedAlert(alerts[0] ?? null);
        }
      } else {
        const error = await res.json();
        toast.error(error.error || 'Failed to delete alert');
      }
    } catch (error) {
      toast.error('Failed to delete alert');
    } finally {
      setShowDeleteDialog(false);
      setAlertToDelete(null);
    }
  };

  const getDueDateChip = (alert: Alert) => {
    if (alert.isOverdue) {
      const diffDays = Math.ceil((new Date().getTime() - new Date(alert.dueDate).getTime()) / 86400000);
      return (
        <Badge variant="destructive" className="text-xs">
          {diffDays} days overdue
        </Badge>
      );
    }

    const diffMs = new Date(alert.dueDate).getTime() - new Date().getTime();
    const diffDays = Math.ceil(diffMs / 86400000);

    if (diffDays <= 0) {
      return <Badge variant="secondary" className="text-xs">Due today</Badge>;
    }

    let variant: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' | 'info' = 'outline';
    let chipText = `${diffDays} days left`;

    if (diffDays <= 7) {
      variant = 'destructive';
      chipText = `Due in ${diffDays} days`;
    } else if (diffDays <= 30) {
      variant = 'warning';
      chipText = `Due in ${diffDays} days`;
    } else {
      variant = 'secondary';
      chipText = `Due in ${diffDays} days`;
    }

    return <Badge variant={variant} className="text-xs">{chipText}</Badge>;
  };

  const getPriorityColor = (priority: Priority) => {
    const found = PRIORITIES.find((p) => p.value === priority);
    return found?.color || 'bg-gray-500';
  };

  const getStatusVariant = (status: AlertStatus) => {
    switch (status) {
      case 'OPEN': return 'secondary';
      case 'IN_PROGRESS': return 'warning';
      case 'SUBMITTED': return 'info';
      case 'COMPLETED': return 'success';
      case 'OVERDUE': return 'destructive';
      case 'CANCELLED': return 'outline';
      default: return 'outline';
    }
  };

  const getTypeLabel = (type: AlertType) => {
    return ALERT_TYPES.find((t) => t.value === type)?.label || type;
  };

  const getTypeColor = (type: AlertType) => {
    const colors: Record<AlertType, string> = {
      REGULATORY: 'bg-purple-500',
      STATUTORY: 'bg-indigo-500',
      LICENSE_RENEWAL: 'bg-cyan-500',
      CONTRACT_RENEWAL: 'bg-teal-500',
      INSURANCE: 'bg-emerald-500',
      INSPECTION: 'bg-amber-500',
      COMPLIANCE_FILING: 'bg-rose-500',
    };
    return colors[type] || 'bg-gray-500';
  };

  const canUserModify = (alert: Alert) => {
    return isManager || (user.role === 'TEAM_MEMBER' && alert.ownerId === user.id);
  };

  const handleStatusChange = async (alert: Alert, newStatus: AlertStatus) => {
    try {
      const res = await fetch(`/api/alerts/${alert.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        const updated = await res.json();
        setAlerts((prev) =>
          prev.map((a) => (a.id === alert.id ? { ...a, ...updated } : a))
        );
        setSelectedAlert((prev) =>
          prev?.id === alert.id ? { ...prev, ...updated } : prev
        );
        toast.success(`Status updated to ${newStatus.replace('_', ' ')}`);
      } else {
        const error = await res.json();
        toast.error(error.error || 'Failed to update status');
      }
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const handleCompleteAlert = async (alert: Alert) => {
    try {
      const res = await fetch(`/api/alerts/${alert.id}/complete`, {
        method: 'POST',
      });
      if (res.ok) {
        toast.success('Alert completed successfully');
        setAlerts((prev) => prev.filter((a) => a.id !== alert.id));
        if (selectedAlert?.id === alert.id) {
          setSelectedAlert(null);
        }
      } else {
        const error = await res.json();
        toast.error(error.error || 'Failed to complete alert');
      }
    } catch (error) {
      toast.error('Failed to complete alert');
    }
  };

  return (
    <div className="flex-1">
      <main className="max-w-7xl mx-auto w-full py-6 px-4 lg:px-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Alerts</h1>
            <p className="text-muted-foreground">
              Alert & Compliance Management (AMC) - Monitor and track regulatory obligations
            </p>
          </div>
          {canCreate && (
            <Button asChild>
              <Link href="/alerts/new">
                <Plus className="h-4 w-4 mr-2" />
                New Alert
              </Link>
            </Button>
          )}
        </div>

        <div className="flex gap-6 h-[calc(100vh-160px)]">
          {/* Left Pane - Alert List */}
          <div className="flex-1 min-w-[380px] flex flex-col">
            {/* Search + Filters */}
            <div className="space-y-3 mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by title, reference, or ALT-0001..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  className="pl-10"
                />
              </div>

              <div className="flex gap-2">
                <Button
                  variant={showFilters ? "default" : "outline"}
                  size="sm"
                  onClick={() => setShowFilters(!showFilters)}
                >
                  <Filter className="h-4 w-4 mr-2" />
                  Filters
                  {showFilters ? <X className="h-3 w-3 ml-2" /> : null}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleFilterChange('overdue', !filters.overdue)}
                  className={filters.overdue ? 'bg-destructive/10' : ''}
                >
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Overdue Only
                </Button>
              </div>

              {showFilters && (
                <Card>
                  <CardContent className="pt-4 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs">Type</Label>
                        <Select
                          value={filters.type}
                          onValueChange={(v) => handleFilterChange('type', v)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Types</SelectItem>
                            {ALERT_TYPES.map((t) => (
                              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label className="text-xs">Status</Label>
                        <Select
                          value={filters.status}
                          onValueChange={(v) => handleFilterChange('status', v)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Statuses</SelectItem>
                            {ALERT_STATUSES.map((s) => (
                              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label className="text-xs">Priority</Label>
                        <Select
                          value={filters.priority}
                          onValueChange={(v) => handleFilterChange('priority', v)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Priorities</SelectItem>
                            {PRIORITIES.map((p) => (
                              <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label className="text-xs">Entity</Label>
                        <Select
                          value={filters.entityId}
                          onValueChange={(v) => handleFilterChange('entityId', v)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Entities</SelectItem>
                            {entities.map((e) => (
                              <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label className="text-xs">Owner</Label>
                        <Select
                          value={filters.ownerId}
                          onValueChange={(v) => handleFilterChange('ownerId', v)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Owners</SelectItem>
                            {users.map((u) => (
                              <SelectItem key={u.id} value={u.id}>{u.name || u.email}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label className="text-xs">Due Date Range</Label>
                        <div className="flex gap-2">
                          <Input
                            type="date"
                            value={filters.dueFrom}
                            onChange={(e) => handleFilterChange('dueFrom', e.target.value)}
                            className="text-xs"
                          />
                          <Input
                            type="date"
                            value={filters.dueTo}
                            onChange={(e) => handleFilterChange('dueTo', e.target.value)}
                            className="text-xs"
                          />
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <Button variant="outline" size="sm" onClick={resetFilters}>
                        Reset
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Stats Cards */}
            {stats && (
              <div className="grid grid-cols-3 gap-2 mb-4">
                <Card>
                  <CardContent className="pt-3">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-destructive">{stats.overdue}</div>
                      <div className="text-xs text-muted-foreground">Overdue</div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-3">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-orange-500">{stats.upcoming}</div>
                      <div className="text-xs text-muted-foreground">Due in 30 days</div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-3">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-500">{stats.total}</div>
                      <div className="text-xs text-muted-foreground">Total</div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Alert List */}
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="space-y-2">
                  {[...Array(8)].map((_, i) => (
                    <div key={i} className="h-16 bg-muted rounded animate-pulse" />
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  {alerts.map((alert) => (
                    <Card
                      key={alert.id}
                      className={cn(
                        'cursor-pointer transition-all hover:shadow-md',
                        selectedAlert?.id === alert.id
                          ? 'ring-2 ring-primary'
                          : 'hover:bg-accent/50'
                      )}
                      onClick={() => setSelectedAlert(alert)}
                    >
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline" className="text-xs font-mono">
                                {alert.alertNumberDisplay}
                              </Badge>
                              <div className={`w-2 h-2 rounded-full ${getTypeColor(alert.type)}`} />
                              <span className="text-xs text-muted-foreground">{getTypeLabel(alert.type)}</span>
                              <Badge variant={getPriorityColor(alert.priority) as any} className="text-xs">
                                {alert.priority}
                              </Badge>
                              {isGlobal && alert.department && (
                                <Badge variant="outline" className="text-xs">{alert.department.name}</Badge>
                              )}
                            </div>
                            <h3 className="font-medium truncate">{alert.title}</h3>
                            <p className="text-sm text-muted-foreground truncate">
                              {alert.entity?.name}
                            </p>
                          </div>
                          <div className="ml-3 flex flex-col items-end gap-1">
                            {getDueDateChip(alert)}
                            <Badge variant={getStatusVariant(alert.status)} className="text-xs">
                              {alert.status.replace('_', ' ')}
                            </Badge>
                            {alert.owner && (
                              <div className="flex items-center gap-1">
                                <UserCheck className="h-3 w-3 text-muted-foreground" />
                                <span className="text-xs text-muted-foreground truncate max-w-[100px]">
                                  {alert.owner.name || alert.owner.email}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}

                  {alerts.length === 0 && !loading && (
                    <div className="text-center py-8 text-muted-foreground">
                      <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>No alerts match your filters</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right Pane - Alert Detail (Desktop) */}
          <div className="hidden lg:block w-1/2 min-w-[400px] max-w-[500px]">
            {selectedAlert ? (
              <AlertDetailPanel
                alert={selectedAlert}
                user={user}
                onClose={() => setSelectedAlert(null)}
                onStatusChange={handleStatusChange}
                onComplete={handleCompleteAlert}
                onDelete={(alert) => {
                  setAlertToDelete(alert);
                  setShowDeleteDialog(true);
                }}
              />
            ) : (
              <Card className="h-full flex items-center justify-center">
                <div className="text-center text-muted-foreground">
                  <AlertTriangle className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>Select an alert to view details</p>
                </div>
              </Card>
            )}
          </div>

          {/* Mobile Sheet for Alert Detail */}
          <Sheet open={!!selectedAlert && window?.innerWidth < 1024} onOpenChange={(open) => {
            if (!open) setSelectedAlert(null);
          }}>
            {selectedAlert && (
              <SheetContent className="w-full max-w-full sm:max-w-[500px] p-0" side="right">
                <AlertDetailPanel
                  alert={selectedAlert}
                  user={user}
                  onClose={() => setSelectedAlert(null)}
                  onStatusChange={handleStatusChange}
                  onComplete={handleCompleteAlert}
                  onDelete={(alert) => {
                    setAlertToDelete(alert);
                    setShowDeleteDialog(true);
                  }}
                />
              </SheetContent>
            )}
          </Sheet>
        </div>
      </main>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Alert</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{alertToDelete?.title}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button
              variant="destructive"
              onClick={() => alertToDelete && handleDeleteAlert(alertToDelete)}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface AlertDetailPanelProps {
  alert: Alert;
  user: { id: string; name: string; email: string; role: string };
  onClose: () => void;
  onStatusChange: (alert: Alert, status: AlertStatus) => void;
  onComplete: (alert: Alert) => void;
  onDelete: (alert: Alert) => void;
}

function AlertDetailPanel({ alert, user, onClose, onStatusChange, onComplete, onDelete }: AlertDetailPanelProps) {
  const isManager = user.role === 'SUPER_ADMIN' || user.role === 'MANAGER';
  const isOwner = alert.ownerId === user.id;
  const canModify = isManager || (user.role === 'TEAM_MEMBER' && isOwner);

  const getDueDateChip = (alert: Alert) => {
    if (alert.isOverdue) {
      const diffDays = Math.ceil((new Date().getTime() - new Date(alert.dueDate).getTime()) / 86400000);
      return (
        <Badge variant="destructive">
          {diffDays} days overdue
        </Badge>
      );
    }
    const diffMs = new Date(alert.dueDate).getTime() - new Date().getTime();
    const diffDays = Math.ceil(diffMs / 86400000);
    if (diffDays <= 0) return <Badge variant="secondary">Due today</Badge>;
    if (diffDays <= 7) return <Badge variant="destructive">Due in {diffDays} days</Badge>;
    if (diffDays <= 30) return <Badge variant="warning">Due in {diffDays} days</Badge>;
    return <Badge variant="secondary">Due in {diffDays} days</Badge>;
  };

  const getStatusVariant = (status: AlertStatus) => {
    switch (status) {
      case 'OPEN': return 'secondary';
      case 'IN_PROGRESS': return 'warning';
      case 'SUBMITTED': return 'info';
      case 'COMPLETED': return 'success';
      case 'OVERDUE': return 'destructive';
      case 'CANCELLED': return 'outline';
      default: return 'outline';
    }
  };

  const getNextAllowedStatuses = (currentStatus: AlertStatus): AlertStatus[] => {
    const transitions: Record<AlertStatus, AlertStatus[]> = {
      OPEN: ['IN_PROGRESS', 'CANCELLED'],
      IN_PROGRESS: ['SUBMITTED', 'CANCELLED'],
      SUBMITTED: ['COMPLETED', 'CANCELLED'],
      OVERDUE: ['IN_PROGRESS', 'SUBMITTED', 'CANCELLED'],
      COMPLETED: [],
      CANCELLED: [],
    };
    return transitions[currentStatus] || [];
  };

  const canComplete = ['SUBMITTED', 'OVERDUE', 'IN_PROGRESS', 'OPEN'].includes(alert.status);
  const allowedTransitions = getNextAllowedStatuses(alert.status);

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1 flex-1">
            <CardTitle>{alert.title}</CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="font-mono">
                {alert.alertNumberDisplay}
              </Badge>
              {alert.reference && <span className="text-sm text-muted-foreground">#{alert.reference}</span>}
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-y-auto">
        <div className="space-y-4">
          {/* Status Stepper */}
          <div>
            <Label className="text-xs text-muted-foreground">Status</Label>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant={getStatusVariant(alert.status)}>
                {alert.status.replace('_', ' ')}
              </Badge>
              {getDueDateChip(alert)}
            </div>
            {canModify && allowedTransitions.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {allowedTransitions.map((status) => (
                  <Button
                    key={status}
                    variant="outline"
                    size="sm"
                    onClick={() => onStatusChange(alert, status)}
                  >
                    {status.replace('_', ' ')}
                  </Button>
                ))}
              </div>
            )}
          </div>

          {/* Alert Details */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs text-muted-foreground">Type</Label>
              <p className="font-medium">{alert.type.replace('_', ' ')}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Priority</Label>
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${
                  alert.priority === 'LOW' ? 'bg-blue-500' :
                  alert.priority === 'MEDIUM' ? 'bg-yellow-500' :
                  alert.priority === 'HIGH' ? 'bg-orange-500' : 'bg-red-500'
                }`} />
                <span className="font-medium capitalize">{alert.priority}</span>
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Entity</Label>
              <p className="font-medium">{alert.entity?.name || alert.entityId}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Owner</Label>
              <p className="font-medium">{alert.owner?.name || alert.owner?.email || 'Unassigned'}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Created By</Label>
              <p className="font-medium">{alert.createdBy?.name || alert.createdBy?.email}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Created</Label>
              <p className="font-medium">{formatDate(alert.createdAt)}</p>
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs text-muted-foreground">Trigger Date</Label>
              <p className="font-medium">{formatDate(alert.triggerDate)}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Due Date</Label>
              <p className={cn("font-medium", alert.isOverdue ? "text-destructive" : "")}>
                {formatDate(alert.dueDate)}
              </p>
            </div>
          </div>

          {/* Recurrence */}
          {alert.recurrence && alert.recurrence !== 'ONE_TIME' && (
            <div>
              <Label className="text-xs text-muted-foreground">Recurrence</Label>
              <p className="font-medium capitalize">{alert.recurrence.replace('_', ' ')}</p>
            </div>
          )}

          {/* Regulatory Clause */}
          {alert.regulatoryClause && (
            <div>
              <Label className="text-xs text-muted-foreground">Regulatory Clause</Label>
              <p className="font-medium text-sm">{alert.regulatoryClause}</p>
            </div>
          )}

          {/* Description */}
          {alert.description && (
            <div>
              <Label className="text-xs text-muted-foreground">Description</Label>
              <p className="text-sm mt-1">{alert.description}</p>
            </div>
          )}

          {/* Reminder Rules */}
          {alert.reminderRules && alert.reminderRules.length > 0 && (
            <div>
              <Label className="text-xs text-muted-foreground">Reminder Schedule</Label>
              <div className="flex flex-wrap gap-1 mt-1">
                {alert.reminderRules.filter((r) => r.isActive).map((rule) => (
                  <Badge key={rule.id} variant="outline" className="text-xs">
                    {rule.daysBefore} days before
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Escalation Rules */}
          {alert.escalationRules && alert.escalationRules.length > 0 && (
            <div>
              <Label className="text-xs text-muted-foreground">Escalation Rules</Label>
              <div className="flex flex-col gap-1 mt-1">
                {alert.escalationRules.filter((r) => r.isActive).map((rule) => (
                  <div key={rule.id} className="text-sm">
                    {rule.afterDaysOverdue} days overdue → {rule.escalateToRole}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Evidence */}
          <div>
            <Label className="text-xs text-muted-foreground">Evidence Files</Label>
            {alert.evidence && alert.evidence.length > 0 ? (
              <div className="space-y-2 mt-2">
                {alert.evidence.map((ev) => (
                  <div key={ev.id} className="flex items-center justify-between p-2 border rounded">
                    <div>
                      <p className="font-medium text-sm">{ev.fileName}</p>
                      <p className="text-xs text-muted-foreground">
                        {ev.size > 0 ? `${Math.round(ev.size / 1024)} KB` : ''} • Uploaded by {ev.uploadedBy?.name || ev.uploadedBy?.email}
                      </p>
                    </div>
                    <Button variant="link" size="sm" asChild>
                      <a href={ev.filePath} target="_blank" rel="noopener noreferrer">Download</a>
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground mt-1">No evidence uploaded</p>
            )}
          </div>

          {/* Comments */}
          <div>
            <Label className="text-xs text-muted-foreground">Comments ({alert.comments?.length || 0})</Label>
            {alert.comments && alert.comments.length > 0 ? (
              <div className="space-y-2 mt-2 max-h-[120px] overflow-y-auto">
                {alert.comments.slice(0, 5).map((comment) => (
                  <div key={comment.id} className="text-sm">
                    <div className="font-medium">{comment.author?.name || comment.author?.email}</div>
                    <p className="text-muted-foreground mt-1">{comment.content}</p>
                    <p className="text-xs text-muted-foreground">{formatRelativeTime(comment.createdAt)}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground mt-1">No comments yet</p>
            )}
          </div>
        </div>
      </CardContent>

      <CardHeader>
        <CardContent className="pt-0">
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              asChild
            >
              <Link href={`/alerts/${alert.id}/edit`}>
                Edit Alert
              </Link>
            </Button>
            {canComplete && alert.status !== 'COMPLETED' && (
              <Button
                size="sm"
                onClick={() => onComplete(alert)}
              >
                Complete Alert
              </Button>
            )}
            {canModify && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => onDelete(alert)}
              >
                Delete
              </Button>
            )}
          </div>
        </CardContent>
      </CardHeader>
    </Card>
  );
}


