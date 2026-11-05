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
import { Download, Filter, FileText, BarChart2, AlertTriangle, Clock, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

interface ReportStats {
  total: number;
  byStatus: Record<string, number>;
  byPriority: Record<string, number>;
  byCategory?: Record<string, number>;
  byType?: Record<string, number>;
  overdue: number;
  blockedCount?: number;
  completionRate?: number;
  estimatedVsActual?: { estimated: number; actual: number };
  ageing?: Record<string, number>;
}

const formatAgeingLabel = (key: string) => {
  switch (key) {
    case '1-7': return '1-7 days';
    case '8-30': return '8-30 days';
    case '30plus': return '30+ days';
    default: return key;
  }
};

interface ReportsContentProps {
  user: { id: string; name: string; email: string; role: string };
}

export function ReportsContent({ user }: ReportsContentProps) {
  const [activeTab, setActiveTab] = useState<'tasks' | 'compliance'>('tasks');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [projectFilter, setProjectFilter] = useState('');
  const [taskStats, setTaskStats] = useState<ReportStats | null>(null);
  const [complianceStats, setComplianceStats] = useState<ReportStats | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (dateFrom) params.set('dateFrom', dateFrom);
      if (dateTo) params.set('dateTo', dateTo);
      if (projectFilter) params.set('projectId', projectFilter);

      const [taskRes, complianceRes] = await Promise.all([
        fetch(`/api/reports/tasks?${params.toString()}`),
        fetch(`/api/reports/compliance?${params.toString()}`),
      ]);

      if (taskRes.ok) {
        const data = await taskRes.json();
        setTaskStats(data);
      }
      if (complianceRes.ok) {
        const data = await complianceRes.json();
        setComplianceStats(data);
      }
    } catch (error) {
      toast.error('Failed to load reports');
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, projectFilter]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const exportCsv = (type: 'tasks' | 'compliance') => {
    const params = new URLSearchParams();
    if (dateFrom) params.set('dateFrom', dateFrom);
    if (dateTo) params.set('dateTo', dateTo);
    if (projectFilter) params.set('projectId', projectFilter);
    params.set('export', 'csv');

    window.open(`/api/reports/${type}?${params.toString()}`, '_blank');
  };

  return (
    <div className="flex-1">
            <main className="max-w-7xl mx-auto w-full py-6 px-4 lg:px-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
            <p className="text-muted-foreground">
              Management reporting for tasks and compliance alerts
            </p>
          </div>
        </div>

        <div className="flex gap-4 mb-4">
          <Button
            variant={activeTab === 'tasks' ? 'default' : 'outline'}
            onClick={() => setActiveTab('tasks')}
          >
            <BarChart2 className="h-4 w-4 mr-2" />
            Task Summary
          </Button>
          <Button
            variant={activeTab === 'compliance' ? 'default' : 'outline'}
            onClick={() => setActiveTab('compliance')}
          >
            <FileText className="h-4 w-4 mr-2" />
            Compliance Summary
          </Button>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4">
              <div className="flex flex-col">
                <Label>Date From</Label>
                <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
              </div>
              <div className="flex flex-col">
                <Label>Date To</Label>
                <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
              </div>
              <div className="flex flex-col">
                <Label>Project / Entity</Label>
                <Input value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)} placeholder="Filter..." />
              </div>
              <div className="flex flex-col h-[36px]">
                <Button onClick={fetchReports}>Apply Filters</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {activeTab === 'tasks' ? (
          <div className="space-y-6">
            <TaskSummaryStats stats={taskStats} loading={loading} />
            <TaskBreakdownTable stats={taskStats} />
            <TaskAgeingTable stats={taskStats} />
            <div className="flex justify-end">
              <Button variant="outline" onClick={() => exportCsv('tasks')} disabled={!taskStats || loading}>
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <ComplianceSummaryStats stats={complianceStats} loading={loading} />
            <ComplianceBreakdownTable stats={complianceStats} />
            <div className="flex justify-end">
              <Button variant="outline" onClick={() => exportCsv('compliance')} disabled={!complianceStats || loading}>
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function TaskSummaryStats({ stats, loading }: { stats: ReportStats | null; loading: boolean }) {
  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-4">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="pt-6">
              <div className="h-4 bg-muted rounded w-3/4" />
              <div className="h-8 bg-muted rounded w-1/4 mt-2" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-4">
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Tasks</p>
              <p className="text-2xl font-bold">{stats?.total ?? 0}</p>
            </div>
            <div className="p-3 rounded-full bg-blue-500">
              <BarChart2 className="h-6 w-6 text-white" />
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Overdue</p>
              <p className="text-2xl font-bold text-destructive">{stats?.overdue ?? 0}</p>
            </div>
            <div className="p-3 rounded-full bg-red-500">
              <AlertTriangle className="h-6 w-6 text-white" />
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Blocked</p>
              <p className="text-2xl font-bold text-orange-500">{stats?.blockedCount ?? 0}</p>
            </div>
            <div className="p-3 rounded-full bg-orange-500">
              <AlertTriangle className="h-6 w-6 text-white" />
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Completion Rate</p>
              <p className="text-2xl font-bold text-green-500">
                {stats?.completionRate ?? 0}%
              </p>
            </div>
            <div className="p-3 rounded-full bg-green-500">
              <CheckCircle2 className="h-6 w-6 text-white" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function TaskBreakdownTable({ stats }: { stats: ReportStats | null }) {
  if (!stats) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tasks by Status</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {Object.entries(stats.byStatus).map(([status, count]) => (
            <div key={status} className="flex items-center justify-between">
              <Badge variant="outline">{status.replace('_', ' ')}</Badge>
              <span className="font-medium">{count}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function TaskAgeingTable({ stats }: { stats: ReportStats | null }) {
  if (!stats?.ageing) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Overdue Ageing</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {Object.entries(stats.ageing).map(([period, count]) => (
            <div key={period} className="flex items-center justify-between">
              <span className="text-sm">{formatAgeingLabel(period)}</span>
              <Badge variant="destructive">{count}</Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function ComplianceSummaryStats({ stats, loading }: { stats: ReportStats | null; loading: boolean }) {
  if (loading) return null;

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Alerts</p>
              <p className="text-2xl font-bold">{stats?.total ?? 0}</p>
            </div>
            <div className="p-3 rounded-full bg-blue-500">
              <FileText className="h-6 w-6 text-white" />
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Overdue</p>
              <p className="text-2xl font-bold text-destructive">{stats?.overdue ?? 0}</p>
            </div>
            <div className="p-3 rounded-full bg-red-500">
              <AlertTriangle className="h-6 w-6 text-white" />
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Due in 30 Days</p>
              <p className="text-2xl font-bold text-orange-500">{stats?.overdue ?? 0}</p>
            </div>
            <div className="p-3 rounded-full bg-orange-500">
              <Clock className="h-6 w-6 text-white" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ComplianceBreakdownTable({ stats }: { stats: ReportStats | null }) {
  if (!stats) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Alerts by Type</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {Object.entries(stats.byType ?? {}).map(([type, count]) => (
            <div key={type} className="flex items-center justify-between">
              <Badge variant="outline">{type.replace('_', ' ')}</Badge>
              <span className="font-medium">{count}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}


