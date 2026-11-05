'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
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
  taskId: string | null;
  alertId: string | null;
  createdAt: string;
}

interface AuditTimelineProps {
  entity: string;
  entityId: string;
}

function formatChangeSummary(action: string, oldData: Record<string, unknown> | null, newData: Record<string, unknown> | null, metadata: Record<string, unknown> | null): string {
  if (metadata && metadata.previousAssignee && metadata.newAssignee) {
    return `Reassigned from ${metadata.previousAssignee} to ${metadata.newAssignee}`;
  }

  const changes: string[] = [];

  if (oldData && newData) {
    const allKeys = new Set([...Object.keys(oldData), ...Object.keys(newData)]);

    for (const key of allKeys) {
      const oldVal = oldData[key];
      const newVal = newData[key];

      if (oldVal !== newVal) {
        if (key === 'status') {
          const oldStatus = oldVal?.toString().replace('_', ' ') || 'Unknown';
          const newStatus = newVal?.toString().replace('_', ' ') || 'Unknown';
          changes.push(`Status: ${oldStatus} → ${newStatus}`);
        } else if (key === 'assigneeId') {
          changes.push(`Assignee: ${oldVal || 'Unassigned'} → ${newVal || 'Unassigned'}`);
        } else if (key === 'ownerId') {
          changes.push(`Owner: ${oldVal || 'Unassigned'} → ${newVal || 'Unassigned'}`);
        } else if (key === 'priority') {
          changes.push(`Priority: ${oldVal?.toString().toLowerCase() || 'unknown'} → ${newVal?.toString().toLowerCase() || 'unknown'}`);
        } else if (key !== 'updatedAt' && key !== 'createdAt' && key !== 'taskNumber' && key !== 'alertNumber') {
          if (oldVal !== undefined || newVal !== undefined) {
            changes.push(`${key}: ${JSON.stringify(oldVal)} → ${JSON.stringify(newVal)}`);
          }
        }
      }
    }
  }

  if (changes.length > 0) {
    return changes.join('; ');
  }

  return `${action} performed`;
}

function getActionLabel(action: string): string {
  const labels: Record<string, string> = {
    CREATE: 'Created',
    UPDATE: 'Updated',
    DELETE: 'Deleted',
    REASSIGN: 'Reassigned',
    VERIFY: 'Verified',
    REJECT: 'Rejected',
    BLOCK: 'Blocked',
    UNBLOCK: 'Unblocked',
    MARK_OVERDUE: 'Marked Overdue',
    ESCALATE: 'Escalated',
    COMPLETE: 'Completed',
    CREATE_FROM_TEMPLATE: 'Created from Template',
  };
  return labels[action] || action.charAt(0) + action.slice(1).toLowerCase();
}

function getActionVariant(action: string): 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' | 'info' {
  const destructive: string[] = ['DELETE', 'REJECT', 'ESCALATE', 'MARK_OVERDUE'];
  const success: string[] = ['CREATE', 'VERIFY', 'COMPLETE'];
  const warning: string[] = ['BLOCK', 'UNBLOCK'];

  if (destructive.includes(action)) return 'destructive';
  if (success.includes(action)) return 'success';
  if (warning.includes(action)) return 'warning';
  if (action === 'REASSIGN') return 'info';
  return 'outline';
}

export function AuditTimeline({ entity, entityId }: AuditTimelineProps) {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/admin/audit?entity=${entity}&entityId=${entityId}&limit=50`)
      .then((res) => res.ok ? res.json() : { entries: [] })
      .then((data) => {
        setEntries(data.entries || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [entity, entityId]);

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-12 bg-muted rounded animate-pulse" />
        ))}
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No audit history</p>
    );
  }

  return (
    <div className="space-y-3">
      {entries.map((entry) => (
        <div key={entry.id} className="border-l-2 pl-4 pb-3 relative">
          <div className="absolute -left-[5px] top-0 w-2.5 h-2.5 rounded-full bg-primary" />
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <Badge variant={getActionVariant(entry.action)} className="text-xs">
                {getActionLabel(entry.action)}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {entry.entity} #{entry.entityId?.slice(0, 8)}
              </span>
            </div>
            <span className="text-xs text-muted-foreground">
              {formatDateTime(entry.createdAt)}
            </span>
          </div>
          <p className="text-sm">
            {formatChangeSummary(entry.action, entry.oldData, entry.newData, entry.metadata)}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <Avatar className="h-5 w-5">
              <AvatarFallback className="text-xs">
                {entry.user?.name?.charAt(0).toUpperCase() ?? entry.user?.email?.charAt(0).toUpperCase() ?? 'U'}
              </AvatarFallback>
            </Avatar>
            <span className="text-xs text-muted-foreground">
              {entry.user?.name || entry.user?.email}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
