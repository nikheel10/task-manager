'use client';

import { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableHead, TableHeader, TableRow, TableCell } from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Search, Filter, X, Calendar, AlertTriangle, UserCheck } from 'lucide-react';
import Link from 'next/link';
import { SlideIn } from '@/components/animations';
import { ProgressBar } from '@/components/ui/amc/progress-bar';
import { StatusBadge, VerificationStatusBadge } from '@/components/ui/amc/status-badge';

export type TaskStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'BLOCKED' | 'COMPLETED' | 'CLOSED';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type VerificationOutcome = 'VERIFIED' | 'REJECTED';

  export interface TaskWithDetails {
  id: string;
  taskNumber: number;
  title: string;
  description?: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  type: string;
  estimatedHours?: number | null;
  actualHours: number;
  percentComplete: number;
  dueDate: Date;
  deletedAt?: Date | null;
  verifiedById?: string | null;
  verifiedAt?: Date | null;
  projectId?: string | null;
  assigneeId: string;
  creatorId: string;
  taskNumberDisplay: string;
  isOverdue: boolean;
  isUpcoming: boolean;
  assignee: { id: string; name?: string | null; email: string };
  creator: { id: string; name?: string | null; email: string };
  verifier?: { id: string; name?: string | null; email: string } | null;
  project?: { id: string; name: string } | null;
  category?: { id: string; name: string } | null;
  department?: { id: string; name: string; code: string } | null;
  verifications?: Array<{
    id: string;
    outcome: 'VERIFIED' | 'REJECTED';
    reason: string | null;
    createdAt: string;
    verifier: { id: string; name?: string | null; email: string };
  }> | null;
  _count: { comments: number; checklist: number };
}

interface TasksContentProps {
  user: { id: string; name: string; email: string; role: string; departmentId: string | null; departmentHasGlobalAccess: boolean };
  initialFilters: {
    assigneeId: string;
    status: string;
    priority: string;
    categoryId: string;
    overdueOnly: boolean;
    upcomingOnly: boolean;
  };
}

export function TasksContent({ user, initialFilters }: TasksContentProps) {
  const [tasks, setTasks] = useState<TaskWithDetails[]>([]);
  const [allTasks, setAllTasks] = useState<TaskWithDetails[]>([]);
  const [users, setUsers] = useState<{ id: string; name?: string | null; email: string; role: string }[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState(initialFilters);
  const [showFilters, setShowFilters] = useState(false);

  const isGlobal = user.role === 'SUPER_ADMIN' || user.role === 'MD' || user.departmentHasGlobalAccess === true;
  const isManager = user.role === 'SUPER_ADMIN' || user.role === 'MANAGER';
  const canCreate = isManager;

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.assigneeId !== 'all') params.set('assigneeId', filters.assigneeId);
      if (filters.status !== 'all') params.set('status', filters.status);
      if (filters.priority !== 'all') params.set('priority', filters.priority);
      if (filters.categoryId !== 'all') params.set('categoryId', filters.categoryId);
      if (filters.overdueOnly) params.set('overdueOnly', 'true');
      if (filters.upcomingOnly) params.set('upcomingOnly', 'true');
      params.set('page', '1');
      params.set('limit', '50');

      const res = await fetch(`/api/tasks?${params.toString()}`);
      const data = await res.json();
      setAllTasks(data.tasks ?? []);
      setTasks(data.tasks ?? []);
    } catch {
      setAllTasks([]);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  useEffect(() => {
    if (isManager) {
      fetch('/api/users/eligible')
        .then((res) => res.json())
        .then((data) => setUsers(data ?? []))
        .catch(() => setUsers([]));
    }
  }, [isManager]);

  useEffect(() => {
    const deptId = user.departmentId;
    if (!deptId) return;
    fetch(`/api/task-categories?departmentId=${encodeURIComponent(deptId)}&isActive=true`)
      .then((res) => res.json())
      .then((data) => setCategories(data.categories ?? []))
      .catch(() => setCategories([]));
  }, [user.departmentId]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (filters.assigneeId !== 'all') params.set('assigneeId', filters.assigneeId);
    if (filters.status !== 'all') params.set('status', filters.status);
    if (filters.priority !== 'all') params.set('priority', filters.priority);
    if (filters.categoryId !== 'all') params.set('categoryId', filters.categoryId);
    if (filters.overdueOnly) params.set('overdueOnly', 'true');
    if (filters.upcomingOnly) params.set('upcomingOnly', 'true');
    if (search.trim()) params.set('search', search);
    const url = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ''}`;
    window.history.replaceState(null, '', url);
  }, [filters, search]);

  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const newFilters = {
        assigneeId: params.get('assigneeId') ?? 'all',
        status: params.get('status') ?? 'all',
        priority: params.get('priority') ?? 'all',
        categoryId: params.get('categoryId') ?? 'all',
        overdueOnly: params.get('overdueOnly') === 'true',
        upcomingOnly: params.get('upcomingOnly') === 'true',
      };
      setFilters(newFilters);
      setSearch(params.get('search') ?? '');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    let filtered = [...allTasks];

    if (search.trim()) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter((task) =>
        task.title.toLowerCase().includes(searchLower) ||
        task.taskNumberDisplay.toLowerCase().includes(searchLower) ||
        (task.assignee?.name ?? '').toLowerCase().includes(searchLower) ||
        (task.assignee?.email ?? '').toLowerCase().includes(searchLower)
      );

      const numMatch = search.match(/^TSK[-]?(\d+)$/i) || search.match(/^(\d+)$/);
      if (numMatch) {
        const num = parseInt(numMatch[1], 10);
        filtered = allTasks.filter(
          (t) =>
            t.taskNumber === num ||
            t.title.toLowerCase().includes(searchLower) ||
            (t.assignee?.name ?? '').toLowerCase().includes(searchLower)
        );
      }
    }

    // Category filter
    if (filters.categoryId !== 'all') {
      filtered = filtered.filter((t) => t.category?.id === filters.categoryId);
    }

    setTasks(filtered);
  }, [search, allTasks, filters.categoryId]);

  const handleFilterChange = (key: string, value: string | boolean) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      assigneeId: 'all',
      status: 'all',
      priority: 'all',
      categoryId: 'all',
      overdueOnly: false,
      upcomingOnly: false,
    });
    setSearch('');
  };

  const getAssigneeName = (task: TaskWithDetails) => {
    if (!task.assigneeId || !task.assignee) return 'Unassigned';
    return task.assignee.name ?? task.assignee.email;
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'URGENT': return 'bg-red-500';
      case 'HIGH': return 'bg-orange-500';
      case 'MEDIUM': return 'bg-yellow-500';
      case 'LOW': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  const activeFiltersCount = Object.values(filters).filter(
    (v) => v !== false && v !== 'all'
  ).length;

  return (
    <div className="flex-1">
            <main className="max-w-7xl mx-auto w-full py-6 px-4 lg:px-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Task Register</h1>
            <p className="text-muted-foreground mt-1">{tasks.length} tasks found</p>
          </div>
          {canCreate && (
            <Button asChild>
              <Link href="/tasks/new">
                <Plus className="h-4 w-4 mr-2" />
                New Task
              </Link>
            </Button>
          )}
        </div>

        <div className="space-y-4 mb-6">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search by task name, ID (TSK-12 or 12), or assignee..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
              {search && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
                  onClick={() => setSearch('')}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="gap-2"
            >
              <Filter className="h-4 w-4" />
              Filters
              {activeFiltersCount > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 w-5 rounded-full p-0 text-xs">
                  {activeFiltersCount}
                </Badge>
              )}
            </Button>
          </div>

          {showFilters && (
            <SlideIn direction="down">
              <Card>
                <CardContent className="pt-4">
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Assignee</label>
                      <Select
                        value={filters.assigneeId}
                        onValueChange={(v) => handleFilterChange('assigneeId', v)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="All assignees" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Assignees</SelectItem>
                          <SelectItem value="unassigned">Unassigned</SelectItem>
                          {users.map((u) => (
                            <SelectItem key={u.id} value={u.id}>
                              {u.name ?? u.email}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Status</label>
                      <Select
                        value={filters.status}
                        onValueChange={(v) => handleFilterChange('status', v)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="All statuses" />
                        </SelectTrigger>
<SelectContent>
                              <SelectItem value="all">All Statuses</SelectItem>
                              <SelectItem value="NOT_STARTED">Not Started</SelectItem>
                              <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                              <SelectItem value="BLOCKED">Blocked</SelectItem>
                              <SelectItem value="COMPLETED">Completed</SelectItem>
                              <SelectItem value="CLOSED">Closed</SelectItem>
                            </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Priority</label>
                      <Select
                        value={filters.priority}
                        onValueChange={(v) => handleFilterChange('priority', v)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="All priorities" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Priorities</SelectItem>
                          <SelectItem value="LOW">Low</SelectItem>
                          <SelectItem value="MEDIUM">Medium</SelectItem>
                          <SelectItem value="HIGH">High</SelectItem>
                          <SelectItem value="URGENT">Urgent</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Category</label>
                      <Select
                        value={filters.categoryId}
                        onValueChange={(v) => handleFilterChange('categoryId', v)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="All categories" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Categories</SelectItem>
                          {categories.map((cat) => (
                            <SelectItem key={cat.id} value={cat.id}>
                              {cat.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Overdue Only</label>
                      <div className="flex items-center h-10">
                          <Checkbox
                            id="overdueOnly"
                            checked={filters.overdueOnly}
                            onCheckedChange={(checked: boolean) => handleFilterChange('overdueOnly', checked)}
                          />
                        <label htmlFor="overdueOnly" className="ml-2 text-sm cursor-pointer">
                          Show overdue only
                        </label>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Upcoming (7 days)</label>
                      <div className="flex items-center h-10">
                          <Checkbox
                            id="upcomingOnly"
                            checked={filters.upcomingOnly}
                            onCheckedChange={(checked: boolean) => handleFilterChange('upcomingOnly', checked)}
                          />
                        <label htmlFor="upcomingOnly" className="ml-2 text-sm cursor-pointer">
                          Show upcoming only
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end mt-4">
                    <Button variant="outline" size="sm" onClick={clearFilters}>
                      Clear Filters
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </SlideIn>
          )}
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Task ID</TableHead>
                  <TableHead>Task Name</TableHead>
                  {isGlobal && <TableHead>Department</TableHead>}
                  <TableHead>Category</TableHead>
                  <TableHead>Assignee</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Due Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead>Verification</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <tr>
                    <td colSpan={isGlobal ? 10 : 9} className="text-center py-12 text-muted-foreground">
                      Loading tasks...
                    </td>
                  </tr>
                ) : tasks.length === 0 ? (
                  <tr>
                    <td colSpan={isGlobal ? 10 : 9} className="text-center py-12 text-muted-foreground">
                      No results found.
                    </td>
                  </tr>
                ) : (
                  tasks.map((task) => (
                    <TableRow key={task.id} className="group">
                      <TableCell className="font-mono text-sm align-middle">
                        <Link
                          href={`/tasks/${task.id}`}
                          className="text-primary hover:underline"
                        >
                          {task.taskNumberDisplay}
                        </Link>
                      </TableCell>
                      <TableCell className="font-medium align-middle">
                        <Link
                          href={`/tasks/${task.id}`}
                          className="hover:underline"
                        >
                          {task.title}
                        </Link>
                        {task.isOverdue && (
                          <Badge variant="destructive" className="ml-2">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Overdue
                          </Badge>
                        )}
                      </TableCell>
                      {isGlobal && (
                        <TableCell className="align-middle">
                          {task.department ? (
                            <Badge variant="outline">{task.department.name}</Badge>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      )}
                      <TableCell className="align-middle">
                        {task.category ? (
                          <Badge variant="outline" className="text-xs">
                            {task.category.name}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </TableCell>
                      <TableCell className="align-middle">
                        {task.assigneeId ? (
                          <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                              <UserCheck className="h-4 w-4" />
                            </div>
                            <span>{getAssigneeName(task)}</span>
                          </div>
                        ) : (
                          <Badge variant="outline">Unassigned</Badge>
                        )}
                      </TableCell>
                      <TableCell className="align-middle">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${getPriorityColor(task.priority)}`} />
                          <span className="capitalize">{task.priority}</span>
                        </div>
                      </TableCell>
                      <TableCell className="align-middle">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          <span className={task.isOverdue ? 'text-destructive font-medium' : ''}>
                            {new Date(task.dueDate).toLocaleDateString()}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="align-middle">
                        <div className="flex items-center gap-2 flex-nowrap">
                          <StatusBadge status={task.status} />
                          <VerificationStatusBadge
                            verifiedAt={task.verifiedAt}
                            verifications={task.verifications}
                            taskStatus={task.status}
                          />
                        </div>
                      </TableCell>
                      <TableCell className="align-middle">
                        <div className="w-24">
                          <ProgressBar
                            value={task.percentComplete || 0}
                            showLabel
                            status={task.status}
                          />
                        </div>
                      </TableCell>
                      <TableCell className="align-middle">
                        <VerificationStatusBadge
                          verifiedAt={task.verifiedAt}
                          verifications={task.verifications}
                          taskStatus={task.status}
                        />
                      </TableCell>
                      <TableCell className="text-right align-middle">
                        <Button asChild variant="ghost" size="sm">
                          <Link href={`/tasks/${task.id}`}>
                            View
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

