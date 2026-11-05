'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Save, X, Calendar as CalendarIcon } from 'lucide-react';
import { toast } from 'sonner';

type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
type TaskType = 'TASK' | 'BUG' | 'FEATURE' | 'MAINTENANCE' | 'COMPLIANCE';

interface Department {
  id: string;
  name: string;
  code: string;
  active: boolean;
}

interface User {
  id: string;
  name?: string | null;
  email: string;
  role: string;
}

interface TaskFormProps {
  initialData?: Partial<{
    title: string;
    description: string | null;
    assigneeId: string;
    priority: string;
    dueDate: string;
    type: string | null;
    estimatedHours: number | null;
    projectId: string | null;
    milestoneId: string | null;
    categoryId: string | null;
    departmentId: string | null;
  }>;
  taskId?: string;
  userRole?: string;
  userDepartmentId?: string | null;
}

export function TaskForm({ initialData, taskId, userRole, userDepartmentId }: TaskFormProps) {
  const router = useRouter();
  const [formData, setFormData] = useState({
    title: initialData?.title ?? '',
    description: initialData?.description ?? '',
    assigneeId: initialData?.assigneeId ?? '',
    priority: initialData?.priority ?? '',
    dueDate: initialData?.dueDate ? new Date(initialData.dueDate).toISOString().split('T')[0] : '',
    type: initialData?.type ?? 'TASK',
    estimatedHours: initialData?.estimatedHours ?? '',
    projectId: initialData?.projectId ?? '',
    milestoneId: initialData?.milestoneId ?? '',
    categoryId: initialData?.categoryId ?? '',
    departmentId: initialData?.departmentId ?? userDepartmentId ?? '',
  });

  const [users, setUsers] = useState<User[]>([]);
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
  const [milestones, setMilestones] = useState<{ id: string; name: string; phaseName?: string | null; projectId: string }[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [isEdit, setIsEdit] = useState(!!taskId);

  // Fetch departments for global roles
  useEffect(() => {
    const role = userRole || '';
    if (role === 'SUPER_ADMIN' || role === 'MD') {
      fetch('/api/departments')
        .then((res) => res.json())
        .then((data: { departments: Department[] }) => {
          setDepartments(data.departments?.filter((d: Department) => d.active) ?? []);
        })
        .catch(() => setDepartments([]));
    } else if (userDepartmentId) {
      fetch('/api/departments')
        .then((res) => res.json())
        .then((data: { departments: Department[] }) => {
          setDepartments(data.departments?.filter((d: Department) => d.id === userDepartmentId && d.active) ?? []);
        })
        .catch(() => setDepartments([]));
    }
  }, [userRole, userDepartmentId]);

  // Fetch eligible users (assignees) - will be filtered server-side by department
  useEffect(() => {
    fetch('/api/users/eligible')
      .then((res) => res.json())
      .then((data) => setUsers(data ?? []))
      .catch(() => setUsers([]));
  }, []);

  // Fetch projects
  useEffect(() => {
    fetch('/api/projects?isActive=true')
      .then((res) => res.json())
      .then((data) => setProjects(data.projects ?? []))
      .catch(() => setProjects([]));
  }, []);

  // Fetch categories based on selected department
  useEffect(() => {
    const deptId = formData.departmentId;
    if (!deptId) {
      setCategories([]);
      return;
    }
    setCategoriesLoading(true);
    fetch(`/api/task-categories?departmentId=${encodeURIComponent(deptId)}&isActive=true`)
      .then(async (res) => {
        if (!res.ok) {
          if (res.status === 403) {
            setCategories([]);
            setCategoriesLoading(false);
            return;
          }
          throw new Error('Failed to load categories');
        }
        return res.json();
      })
      .then((data) => {
        setCategories(data.categories ?? []);
        setCategoriesLoading(false);
      })
      .catch(() => {
        setCategories([]);
        setCategoriesLoading(false);
      });
  }, [formData.departmentId]);

  // Fetch milestones when project changes
  useEffect(() => {
    if (formData.projectId) {
      fetch(`/api/milestones?projectId=${formData.projectId}`)
        .then((res) => res.json())
        .then((data) => setMilestones(data.milestones ?? []))
        .catch(() => setMilestones([]));
    } else {
      setMilestones([]);
    }
  }, [formData.projectId]);

  // Reset category and assignee when department changes
  useEffect(() => {
    if (isEdit) return; // Don't reset on edit
    setFormData((prev) => ({ ...prev, categoryId: '', assigneeId: '' }));
  }, [formData.departmentId, isEdit]);

  const validate = () => {
    const errors: Record<string, string> = {};

    if (!formData.title.trim()) {
      errors.title = 'Task name is required';
    }

    if (!formData.departmentId) {
      errors.departmentId = 'Department is required';
    }

    if (!formData.categoryId) {
      errors.categoryId = 'Please select a category';
    }

    if (!formData.assigneeId) {
      errors.assigneeId = 'Assignee is required';
    }

    if (!formData.priority) {
      errors.priority = 'Priority is required';
    }

    if (!formData.dueDate) {
      errors.dueDate = 'Due date is required';
    } else {
      const parts = formData.dueDate.split('-').map(Number);
      const due = new Date(parts[0], parts[1] - 1, parts[2]);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (isNaN(due.getTime())) {
        errors.dueDate = 'Invalid date format';
      } else if (!taskId && due < today) {
        errors.dueDate = 'Due date cannot be in the past';
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});

    if (!validate()) return;

    setIsSubmitting(true);

    try {
      const payload = {
        title: formData.title,
        description: formData.description || undefined,
        assigneeId: formData.assigneeId,
        priority: formData.priority as TaskPriority,
        dueDate: new Date(formData.dueDate).toISOString(),
        type: formData.type as TaskType,
        estimatedHours: formData.estimatedHours ? Number(formData.estimatedHours) : undefined,
        projectId: formData.projectId || undefined,
        milestoneId: formData.milestoneId || undefined,
        categoryId: formData.categoryId || undefined,
        departmentId: formData.departmentId || undefined,
      };

      const url = taskId ? `/api/tasks/${taskId}` : '/api/tasks';
      const method = taskId ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.fieldErrors) {
          const errors: Record<string, string> = {};
          Object.entries(data.fieldErrors).forEach(([key, val]) => {
            errors[key] = Array.isArray(val) ? val[0] : val;
          });
          setFieldErrors(errors);
        } else {
          toast.error(data.error || 'Something went wrong');
        }
        return;
      }

      toast.success(taskId ? 'Task updated successfully' : 'Task created successfully');
      router.push('/tasks');
      router.refresh();
    } catch {
      toast.error('Network error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.push('/tasks');
  };

  const handleInputChange = (field: string, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (fieldErrors[field]) {
      setFieldErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const canChangeDepartment = userRole === 'SUPER_ADMIN' || userRole === 'MD';

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>
            {taskId ? 'Edit Task' : 'Create New Task'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Department field - only for global roles or cross-department mode */}
          {canChangeDepartment || (userRole === 'MANAGER' && userDepartmentId) ? (
            <div className="space-y-2">
              <Label htmlFor="departmentId">Department *</Label>
              <Select
                value={formData.departmentId || undefined}
                onValueChange={(value) => handleInputChange('departmentId', value)}
                disabled={isSubmitting || !canChangeDepartment}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id}>
                      {dept.name} ({dept.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {fieldErrors.departmentId && <p className="text-sm text-destructive">{fieldErrors.departmentId}</p>}
              {!canChangeDepartment && userDepartmentId && (
                <p className="text-xs text-muted-foreground">Department: {departments.find((d) => d.id === userDepartmentId)?.name}</p>
              )}
            </div>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="title">Task Name *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              placeholder="Enter task name"
              error={!!fieldErrors.title}
              disabled={isSubmitting}
            />
            {fieldErrors.title && <p className="text-sm text-destructive">{fieldErrors.title}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Enter task description (optional)"
              rows={4}
              disabled={isSubmitting}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="categoryId">Category *</Label>
              <Select
                value={formData.categoryId || undefined}
                onValueChange={(value) => handleInputChange('categoryId', value)}
                disabled={isSubmitting || !formData.departmentId || categoriesLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder={categoriesLoading ? 'Loading categories...' : 'Select category'} />
                </SelectTrigger>
                <SelectContent>
                  {categories.length === 0 && !categoriesLoading ? (
                    <SelectItem value="" disabled>
                      No categories for this department. Ask the admin to add one.
                    </SelectItem>
                  ) : (
                    categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {categoriesLoading && <p className="text-xs text-muted-foreground">Loading categories...</p>}
              {fieldErrors.categoryId && <p className="text-sm text-destructive">{fieldErrors.categoryId}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="assigneeId">Assignee *</Label>
              <Select
                value={formData.assigneeId || undefined}
                onValueChange={(value) => handleInputChange('assigneeId', value)}
                disabled={isSubmitting || !formData.departmentId}
              >
                <SelectTrigger error={!!fieldErrors.assigneeId}>
                  <SelectValue placeholder="Select assignee" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name ?? user.email} ({user.role})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {fieldErrors.assigneeId && <p className="text-sm text-destructive">{fieldErrors.assigneeId}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="priority">Priority *</Label>
              <Select
                value={formData.priority || undefined}
                onValueChange={(value) => handleInputChange('priority', value)}
                disabled={isSubmitting}
              >
                <SelectTrigger error={!!fieldErrors.priority}>
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOW">Low</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                  <SelectItem value="URGENT">Urgent</SelectItem>
                </SelectContent>
              </Select>
              {fieldErrors.priority && <p className="text-sm text-destructive">{fieldErrors.priority}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Task Type</Label>
              <Select
                value={formData.type}
                onValueChange={(value) => handleInputChange('type', value)}
                disabled={isSubmitting}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TASK">Task</SelectItem>
                  <SelectItem value="BUG">Bug</SelectItem>
                  <SelectItem value="FEATURE">Feature</SelectItem>
                  <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
                  <SelectItem value="COMPLIANCE">Compliance</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dueDate">Due Date *</Label>
              <div className="relative">
                <Input
                  id="dueDate"
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => handleInputChange('dueDate', e.target.value)}
                  error={!!fieldErrors.dueDate}
                  disabled={isSubmitting}
                  className="pl-10"
                  min={new Date().toLocaleDateString('en-CA')}
                />
                <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              </div>
              {fieldErrors.dueDate && <p className="text-sm text-destructive">{fieldErrors.dueDate}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="projectId">Project</Label>
              <Select
                value={formData.projectId || undefined}
                onValueChange={(value) => handleInputChange('projectId', value)}
                disabled={isSubmitting}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select project" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((proj) => (
                    <SelectItem key={proj.id} value={proj.id}>
                      {proj.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="milestoneId">Milestone</Label>
              <Select
                value={formData.milestoneId || undefined}
                onValueChange={(value) => handleInputChange('milestoneId', value)}
                disabled={isSubmitting}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select milestone" />
                </SelectTrigger>
                <SelectContent>
                  {milestones.map((ms) => (
                    <SelectItem key={ms.id} value={ms.id}>
                      {ms.name}{ms.phaseName && ` (${ms.phaseName})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="estimatedHours">Estimated Hours (optional)</Label>
            <Input
              id="estimatedHours"
              type="number"
              min="0"
              step="0.5"
              value={formData.estimatedHours || ''}
              onChange={(e) => handleInputChange('estimatedHours', e.target.value)}
              placeholder="e.g. 4.5"
              disabled={isSubmitting}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end space-x-3">
        <Button type="button" variant="outline" onClick={handleCancel} disabled={isSubmitting}>
          <X className="h-4 w-4 mr-2" />
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {taskId ? 'Saving...' : 'Creating...'}
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              {taskId ? 'Update Task' : 'Create Task'}
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
