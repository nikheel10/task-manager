'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  ListTodo,
  Clock,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  Users,
  BarChart3,
  Building,
  ChevronDown,
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { AlertStats } from '@/app/(app)/alerts/types';
import { StatCard } from '@/components/ui/amc/stat-card';
import { ProgressBar } from '@/components/ui/amc/progress-bar';
import { StatusBadge } from '@/components/ui/amc/status-badge';
import { PriorityBadge } from '@/components/ui/amc/priority-badge';
import { EmptyState } from '@/components/ui/amc/empty-state';
import { useSession } from 'next-auth/react';

interface Stats {
  totals: {
    total: number;
    notStarted: number;
    inProgress: number;
    completed: number;
    closed: number;
  };
  overdue: number;
  upcoming: number;
  avgProgress: number;
  byPriority: Record<string, number>;
  byStatus: Record<string, number>;
}

interface Department {
  id: string;
  name: string;
  code: string;
}

interface DashboardContentProps {
  user: { id: string; name: string; email: string; role: string; departmentId: string | null; departmentHasGlobalAccess: boolean };
}

export function DashboardContent({ user }: DashboardContentProps) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [alertStats, setAlertStats] = useState<AlertStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [departments, setDepartments] = useState<{ id: string; name: string; code: string }[]>([]);
  const [selectedDeptId, setSelectedDeptId] = useState<string>('');
  const [deptDropdownOpen, setDeptDropdownOpen] = useState(false);

  const isGlobal = user.role === 'SUPER_ADMIN' || user.role === 'MD' || user.departmentHasGlobalAccess === true;

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (isGlobal && selectedDeptId) {
          params.set('departmentId', selectedDeptId);
        }
        const res = await fetch(`/api/dashboard/stats?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        }
      } catch {}
      setLoading(false);
    };
    fetchStats();
  }, [selectedDeptId, isGlobal]);

  useEffect(() => {
    fetch('/api/alerts/stats')
      .then((res) => res.ok ? res.json() : null)
      .then((data) => setAlertStats(data))
      .catch(() => {});
  }, []);

  // Fetch departments for global viewer dropdown
  useEffect(() => {
    if (isGlobal) {
      fetch('/api/departments')
        .then((res) => res.ok ? res.json() : { departments: [] })
        .then((data) => {
          setDepartments(data.departments || []);
          if (user.departmentId && !selectedDeptId) {
            setSelectedDeptId(user.departmentId);
          }
        })
        .catch(() => {});
    }
  }, [isGlobal]);

  const isManager = user.role === 'SUPER_ADMIN' || user.role === 'MANAGER';

  const statCards = [
    { name: 'Total Tasks', value: stats?.totals.total ?? 0, icon: ListTodo, href: '/tasks' },
    { name: 'Not Started', value: stats?.totals.notStarted ?? 0, icon: Clock, href: '/tasks?status=NOT_STARTED' },
    { name: 'In Progress', value: stats?.totals.inProgress ?? 0, icon: TrendingUp, href: '/tasks?status=IN_PROGRESS' },
    { name: 'Completed', value: stats?.totals.completed ?? 0, icon: CheckCircle2, href: '/tasks?status=COMPLETED' },
    { name: 'Overdue', value: stats?.overdue ?? 0, icon: AlertTriangle, href: '/tasks?overdueOnly=true' },
    { name: 'Alerts Due 30d', value: alertStats?.upcoming ?? 0, icon: Clock, href: '/alerts' },
  ];

  return (
    <div className="flex-1">
      <main className="max-w-7xl mx-auto w-full py-6 px-4 lg:px-6">
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground">
              Welcome back, {user.name} — here's what needs your attention today
            </p>
          </div>
          
          {/* Department indicator/dropdown */}
          {isGlobal && (
            <div className="relative" onMouseLeave={() => setDeptDropdownOpen(false)}>
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-auto px-3"
                onClick={() => setDeptDropdownOpen(!deptDropdownOpen)}
              >
                <Building className="h-4 w-4 mr-1" />
                {selectedDeptId 
                  ? departments.find(d => d.id === selectedDeptId)?.name
                  : 'All Departments'}
                <ChevronDown className="h-4 w-4 ml-1" />
              </Button>
              {deptDropdownOpen && (
                <div className="absolute right-0 mt-1 w-56 rounded-md bg-popover py-1 shadow-lg border border-border z-50">
                  <button
                    className={`w-full px-3 py-2 text-left text-sm ${!selectedDeptId ? 'bg-accent' : ''}`}
                    onClick={() => { setSelectedDeptId(''); setDeptDropdownOpen(false); }}
                  >
                    All Departments
                  </button>
                  {departments.map((dept) => (
                    <button
                      key={dept.id}
                      className={`w-full px-3 py-2 text-left text-sm ${selectedDeptId === dept.id ? 'bg-accent' : ''}`}
                      onClick={() => { setSelectedDeptId(dept.id); setDeptDropdownOpen(false); }}
                    >
                      {dept.name} ({dept.code})
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          
          {!isGlobal && user.departmentId && (
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="gap-1">
                <Building className="h-3 w-3" />
                {departments.find(d => d.id === user.departmentId)?.name || user.departmentId}
              </Badge>
            </div>
          )}
        </div>

        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[...Array(6)].map((_, i) => (
              <StatCard key={i} title="Loading" value="—" className="animate-pulse" />
            ))}
          </div>
        ) : (
          <div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
              {statCards.map((stat) => (
                <StatCard
                  key={stat.name}
                  title={stat.name}
                  value={stat.value}
                  icon={<stat.icon className="h-5 w-5" />}
                  href={stat.href}
                />
              ))}
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Overall Progress
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <ProgressBar value={stats?.avgProgress ?? 0} showLabel />
                    <p className="text-xs text-muted-foreground">
                      {stats?.totals.completed ?? 0} of {stats?.totals.total ?? 0} tasks completed
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Priority Breakdown
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Object.entries(stats?.byPriority ?? {}).map(([priority, count]) => (
                      <div key={priority} className="flex items-center justify-between">
                        <PriorityBadge priority={priority as any} />
                        <span className="font-medium">{count}</span>
                      </div>
                    ))}
                    {Object.keys(stats?.byPriority ?? {}).length === 0 && (
                      <EmptyState title="No tasks yet" description="No tasks found" icon="noTasks" />
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ListTodo className="h-5 w-5" />
                    Status Breakdown
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Object.entries(stats?.byStatus ?? {}).map(([status, count]) => (
                      <div key={status} className="flex items-center justify-between">
                        <StatusBadge status={status as any} />
                        <span className="font-medium">{count}</span>
                      </div>
                    ))}
                    {Object.keys(stats?.byStatus ?? {}).length === 0 && (
                      <EmptyState title="No tasks yet" description="No tasks found" icon="noTasks" />
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5" />
                    Quick Actions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Button asChild variant="outline" className="w-full justify-start">
                      <Link href="/tasks?status=NOT_STARTED">
                        <ListTodo className="h-4 w-4 mr-2" />
                        View Not Started
                      </Link>
                    </Button>
                    <Button asChild variant="outline" className="w-full justify-start">
                      <Link href="/tasks?overdueOnly=true">
                        <AlertTriangle className="h-4 w-4 mr-2" />
                        View Overdue Tasks
                      </Link>
                    </Button>
                    {isManager && (
                      <Button asChild className="w-full justify-start">
                        <Link href="/tasks/new">
                          <ListTodo className="h-4 w-4 mr-2" />
                          Create New Task
                        </Link>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {alertStats && (
              <div className="mt-8">
                <h2 className="text-xl font-semibold mb-4">Compliance Overview</h2>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
                  <StatCard
                    title="Overdue Alerts"
                    value={alertStats.overdue}
                    icon={<AlertTriangle className="h-5 w-5" />}
                    href="/alerts?overdue=true"
                  />
                  <StatCard
                    title="Due in 30 Days"
                    value={alertStats.upcoming}
                    icon={<Clock className="h-5 w-5" />}
                    href="/alerts"
                  />
                  <StatCard
                    title="Total Alerts"
                    value={alertStats.total}
                    icon={<ListTodo className="h-5 w-5" />}
                    href="/alerts"
                  />
                  <StatCard
                    title="Active Alerts"
                    value={
                      alertStats.statusCounts['OPEN'] +
                      alertStats.statusCounts['IN_PROGRESS'] +
                      alertStats.statusCounts['SUBMITTED'] ||
                      0
                    }
                    icon={<CheckCircle2 className="h-5 w-5" />}
                    href="/alerts"
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <BarChart3 className="h-5 w-5" />
                        Alerts by Status
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {Object.entries(alertStats.statusCounts).map(([status, count]) => (
                          <div key={status} className="flex items-center justify-between">
                            <Badge variant="outline">{status.replace('_', ' ')}</Badge>
                            <span className="font-medium">{count}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <BarChart3 className="h-5 w-5" />
                        Alerts by Type
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {Object.entries(alertStats.typeCounts).map(([type, count]) => (
                          <div key={type} className="flex items-center justify-between">
                            <Badge variant="outline">{type.replace('_', ' ')}</Badge>
                            <span className="font-medium">{count}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5" />
                        Quick Actions
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <Button asChild variant="outline" className="w-full justify-start">
                          <Link href="/alerts">View All Alerts</Link>
                        </Button>
                        {isManager && (
                          <Button asChild variant="outline" className="w-full justify-start">
                            <Link href="/alerts/new">Create New Alert</Link>
                          </Button>
                        )}
                        <Button asChild variant="outline" className="w-full justify-start">
                          <Link href="/alerts/calendar">Calendar View</Link>
                        </Button>
                        {isManager && (
                          <Button asChild variant="outline" className="w-full justify-start">
                            <Link href="/entities">Manage Entities</Link>
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}