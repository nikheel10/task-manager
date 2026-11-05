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
import { Download, Search, Filter, X } from 'lucide-react';
import { toast } from 'sonner';
import { formatDateTime } from '@/lib/utils';

interface AuditEntry {
  id: string;
  action: string;
  entity: string;
  entityId: string;
  oldData: Record<string, unknown> | null;
  newData: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  userId: string;
  user: { id: string; name?: string | null; email: string };
  taskId?: { id: string; title: string; taskNumber: number } | null;
  alertId?: { id: string; title: string; alertNumber: number } | null;
  createdAt: string;
}

interface AuditContentProps {
  user: { id: string; name: string; email: string; role: string };
}

export function AuditContent({ user }: AuditContentProps) {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    entity: '',
    entityId: '',
    userId: '',
    action: '',
    dateFrom: '',
    dateTo: '',
  });
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 50;

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.entity) params.set('entity', filters.entity);
      if (filters.entityId) params.set('entityId', filters.entityId);
      if (filters.userId) params.set('userId', filters.userId);
      if (filters.action) params.set('action', filters.action);
      if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
      if (filters.dateTo) params.set('dateTo', filters.dateTo);
      params.set('page', String(page));
      params.set('limit', String(limit));

      const res = await fetch(`/api/admin/audit?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setEntries(data.entries || []);
        setTotal(data.pagination?.total || 0);
      }
    } catch (error) {
      toast.error('Failed to load audit log');
    } finally {
      setLoading(false);
    }
  }, [filters, page, limit]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  const handleExportCsv = () => {
    const params = new URLSearchParams();
    if (filters.entity) params.set('entity', filters.entity);
    if (filters.entityId) params.set('entityId', filters.entityId);
    if (filters.userId) params.set('userId', filters.userId);
    if (filters.action) params.set('action', filters.action);
    if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
    if (filters.dateTo) params.set('dateTo', filters.dateTo);
    params.set('export', 'csv');

    window.open(`/api/admin/audit?${params.toString()}`, '_blank');
  };

  const clearFilters = () => {
    setFilters({ entity: '', entityId: '', userId: '', action: '', dateFrom: '', dateTo: '' });
    setPage(1);
  };

  const getActionVariant = (action: string) => {
    const destructive: string[] = ['DELETE', 'REJECT', 'ESCALATE', 'MARK_OVERDUE'];
    const success: string[] = ['CREATE', 'VERIFY', 'COMPLETE'];
    const warning: string[] = ['BLOCK', 'UNBLOCK'];
    const info: string[] = ['REASSIGN'];

    if (destructive.includes(action)) return 'destructive';
    if (success.includes(action)) return 'success';
    if (warning.includes(action)) return 'warning';
    if (info.includes(action)) return 'info';
    return 'outline';
  };

  const formatChangeDescription = (entry: AuditEntry): string => {
    if (entry.metadata?.previousAssignee && entry.metadata?.newAssignee) {
      return `Reassigned from ${entry.metadata.previousAssignee} to ${entry.metadata.newAssignee}`;
    }

    const changes: string[] = [];
    if (entry.oldData && entry.newData) {
      const allKeys = new Set([...Object.keys(entry.oldData), ...Object.keys(entry.newData)]);
      for (const key of allKeys) {
        if (key === 'updatedAt' || key === 'createdAt' || key === 'taskNumber' || key === 'alertNumber') continue;
        const oldVal = entry.oldData[key];
        const newVal = entry.newData[key];
        if (oldVal !== newVal) {
          if (key === 'status') {
            changes.push(`${(oldVal as string)?.replace('_', ' ') || '?'} → ${(newVal as string)?.replace('_', ' ') || '?'}`);
          } else {
            changes.push(`${key}: ${JSON.stringify(oldVal)} → ${JSON.stringify(newVal)}`);
          }
        }
      }
    }
    return changes.join('; ') || `${entry.action}`;
  };

  return (
    <div className="flex-1">
            <main className="max-w-7xl mx-auto w-full py-6 px-4 lg:px-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Audit Log</h1>
            <p className="text-muted-foreground">
              {total} entries ({user.role} access)
            </p>
          </div>
          <Button variant="outline" onClick={handleExportCsv} disabled={entries.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>

        <Card className="mb-4">
          <CardHeader>
            <CardTitle>Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div>
                <Label className="text-xs">Entity</Label>
                <Input
                  value={filters.entity}
                  onChange={(e) => setFilters((f) => ({ ...f, entity: e.target.value }))}
                  placeholder="e.g., Task, Alert"
                  className="text-sm"
                />
              </div>
              <div>
                <Label className="text-xs">Entity ID</Label>
                <Input
                  value={filters.entityId}
                  onChange={(e) => setFilters((f) => ({ ...f, entityId: e.target.value }))}
                  placeholder="Entity ID"
                  className="text-sm"
                />
              </div>
              <div>
                <Label className="text-xs">User ID</Label>
                <Input
                  value={filters.userId}
                  onChange={(e) => setFilters((f) => ({ ...f, userId: e.target.value }))}
                  placeholder="User ID"
                  className="text-sm"
                />
              </div>
              <div>
                <Label className="text-xs">Action</Label>
                <Input
                  value={filters.action}
                  onChange={(e) => setFilters((f) => ({ ...f, action: e.target.value }))}
                  placeholder="e.g., CREATE, UPDATE"
                  className="text-sm"
                />
              </div>
              <div>
                <Label className="text-xs">Date From</Label>
                <Input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => setFilters((f) => ({ ...f, dateFrom: e.target.value }))}
                  className="text-sm"
                />
              </div>
              <div>
                <Label className="text-xs">Date To</Label>
                <Input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => setFilters((f) => ({ ...f, dateTo: e.target.value }))}
                  className="text-sm"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-3">
              <Button variant="outline" size="sm" onClick={clearFilters}>
                <X className="h-3 w-3 mr-1" /> Clear
              </Button>
              <Button size="sm" onClick={() => { setPage(1); fetchEntries(); }}>
                Apply
              </Button>
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <div className="space-y-2">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="h-16 bg-muted rounded animate-pulse" />
            ))}
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No audit entries found</p>
          </div>
        ) : (
          <div className="space-y-2">
            {entries.map((entry) => (
              <Card key={entry.id}>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Badge variant={getActionVariant(entry.action)} className="text-xs">
                        {entry.action}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {entry.entity}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {entry.entityId?.slice(0, 8)}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {formatDateTime(entry.createdAt)}
                    </span>
                  </div>
                  <p className="text-sm mb-1">{formatChangeDescription(entry)}</p>
                  <div className="flex gap-4 text-xs text-muted-foreground">
                    <span>User: {entry.user?.name || entry.user?.email}</span>
                    {entry.taskId && (
                      <span>Task: #{entry.taskId.taskNumber}</span>
                    )}
                    {entry.alertId && (
                      <span>Alert: #{entry.alertId.alertNumber}</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
            {total > entries.length && (
              <div className="flex justify-center py-4">
                <Button
                  variant="outline"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={loading}
                >
                  Load More
                </Button>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}


