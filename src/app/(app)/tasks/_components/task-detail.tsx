'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { StatusBadge, VerificationBadge, VerificationStatusBadge } from '@/components/ui/amc/status-badge';
import { ProgressBar } from '@/components/ui/amc/progress-bar';
import {
  Calendar,
  UserCheck,
  Save,
  X,
  Trash2,
  AlertTriangle,
  Check,
  Send,
  Edit,
  Delete,
  Loader2,
  CheckCircle2,
  FileText,
  Plus,
  Download,
} from 'lucide-react';
import { toast } from 'sonner';

type TaskStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'BLOCKED' | 'COMPLETED' | 'CLOSED';
type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

interface User {
  id: string;
  name?: string | null;
  email: string;
  role: string;
}

interface Task {
  id: string;
  taskNumber: number;
  taskNumberDisplay: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  type: string;
  estimatedHours: number | null;
  actualHours: number;
  percentComplete: number;
  dueDate: string;
  deletedAt: Date | null;
  verifiedById: string | null;
  verifiedAt: Date | null;
  assigneeId: string | null;
  assignee: { id: string; name?: string | null; email: string } | null;
  creatorId: string;
  creator: { id: string; name?: string | null; email: string };
  verifier: { id: string; name?: string | null; email: string } | null;
  project: { id: string; name: string } | null;
  milestone: { id: string; name: string; phaseName?: string | null } | null;
  category: { id: string; name: string } | null;
  blockedReason: string | null;
  blockedAt: Date | null;
  checklist: Array<{
    id: string;
    title: string;
    completed: boolean;
    doneAt: string | null;
    order: number;
    isMandatory: boolean;
    user?: { id: string; name?: string | null; email?: string | null } | null;
  }>;
  comments: Array<{
    id: string;
    content: string;
    editedAt: Date | null;
    createdAt: string;
    updatedAt: string;
    author: { id: string; name?: string | null; email: string };
  }>;
  verifications: Array<{
    id: string;
    outcome: 'VERIFIED' | 'REJECTED';
    reason: string | null;
    createdAt: string;
    verifier: { id: string; name?: string | null; email: string };
  }>;
  attachments?: Array<{
    id: string;
    fileName: string;
    mimeType: string;
    size: number;
    filePath: string;
    createdAt: string;
    uploadedBy: { id: string; name?: string | null; email: string };
  }>;
}

interface Comment {
  id: string;
  content: string;
  editedAt: Date | null;
  createdAt: string;
  updatedAt: string;
  author: { id: string; name?: string | null; email: string };
}

interface TaskDetailProps {
  taskId: string;
  user: { id: string; name: string; email: string; role: string };
}

export function TaskDetail({ taskId, user }: TaskDetailProps) {
  const router = useRouter();
  const [task, setTask] = useState<Task | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [activeAssignee, setActiveAssignee] = useState('');
  const [isSavingAssignee, setIsSavingAssignee] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [editingComment, setEditingComment] = useState<Comment | null>(null);
  const [editText, setEditText] = useState('');
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isSubmittingVerification, setIsSubmittingVerification] = useState(false);
  const [attachments, setAttachments] = useState<Task['attachments']>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [newChecklistTitle, setNewChecklistTitle] = useState('');
  const [newChecklistMandatory, setNewChecklistMandatory] = useState(true);
  const [isAddingChecklist, setIsAddingChecklist] = useState(false);
  const [editingItem, setEditingItem] = useState<Task['checklist'][number] | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editMandatory, setEditMandatory] = useState(false);
  const [isSavingChecklist, setIsSavingChecklist] = useState(false);

  const isManager = user.role === 'SUPER_ADMIN' || user.role === 'MANAGER';
  const canVerify = isManager;
  const canAssign = isManager;
  const canDelete = isManager;
  const canEdit = isManager || (user.role === 'TEAM_MEMBER' && task?.assigneeId === user.id);
  const canTick = isManager || (user.role === 'TEAM_MEMBER' && task?.assigneeId === user.id);

  useEffect(() => {
    fetch(`/api/tasks/${taskId}`)
      .then((res) => {
        if (!res.ok) {
          if (res.status === 404) {
            toast.error('Task not found');
            router.push('/tasks');
            return null;
          }
          throw new Error('Failed to fetch task');
        }
        return res.json();
      })
      .then((data) => {
        if (data) {
          setTask(data);
          setActiveAssignee(data.assigneeId);
        }
        setLoading(false);
      })
      .catch((_error) => {
        
        toast.error('Failed to load task');
        setLoading(false);
      });

if (canAssign) {
      fetch('/api/users/eligible')
        .then((res) => res.json())
        .then((data) => setUsers(data ?? []))
        .catch(() => setUsers([]));
    }

    fetch(`/api/tasks/${taskId}/attachments`)
      .then((res) => res.json())
      .then((data) => setAttachments(data ?? []))
      .catch(() => setAttachments([]));
  }, [taskId, router, canAssign]);

  const refreshTask = async () => {
    try {
      const res = await fetch(`/api/tasks/${taskId}`);
      if (res.ok) {
        const data = await res.json();
        setTask(data);
      }
    } catch {}
  };

  const handleAddChecklistItem = async () => {
    if (!newChecklistTitle.trim()) return;
    setIsAddingChecklist(true);
    try {
      const res = await fetch(`/api/tasks/${taskId}/checklist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newChecklistTitle.trim(), isMandatory: newChecklistMandatory }),
      });
      if (res.ok) {
        setNewChecklistTitle('');
        await refreshTask();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to add checklist item');
      }
    } catch {
      toast.error('Failed to add checklist item');
    }
    setIsAddingChecklist(false);
  };

  const handleUpdateChecklistItem = async (
    item: Task['checklist'][number],
    title: string,
    isMandatory: boolean,
  ) => {
    if (!title.trim()) {
      toast.error('Title is required');
      return;
    }
    if (title.trim() === item.title && isMandatory === item.isMandatory) {
      setEditingItem(null);
      return;
    }
    setIsSavingChecklist(true);
    try {
      const res = await fetch(`/api/tasks/${taskId}/checklist/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), isMandatory }),
      });
      if (res.ok) {
        setEditingItem(null);
        await refreshTask();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to update item');
      }
    } catch {
      toast.error('Failed to update item');
    }
    setIsSavingChecklist(false);
  };

  const refreshAttachments = async () => {
    try {
      const res = await fetch(`/api/tasks/${taskId}/attachments`);
      if (res.ok) {
        const data = await res.json();
        setAttachments(data ?? []);
      }
    } catch {}
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size exceeds 10 MB limit');
      return;
    }

    const allowedTypes = [
      'application/pdf',
      'image/png',
      'image/jpeg',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ];

    if (!allowedTypes.includes(file.type)) {
      toast.error('File type not allowed. Allowed: PDF, PNG, JPG, DOCX, XLSX');
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch(`/api/tasks/${taskId}/attachments`, {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || 'Failed to upload file');
        return;
      }

      toast.success('Attachment uploaded successfully');
      await refreshAttachments();
      e.target.value = '';
    } catch {
      toast.error('Network error uploading file');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteAttachment = async (attachmentId: string) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}/attachments/${attachmentId}`, { method: 'DELETE' });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || 'Failed to delete attachment');
        return;
      }

      toast.success('Attachment deleted');
      await refreshAttachments();
    } catch {
      toast.error('Failed to delete attachment');
    }
  };

  const handleSaveAssignee = async () => {
    if (!task || !activeAssignee || activeAssignee === task.assigneeId) return;

    setIsSavingAssignee(true);
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assigneeId: activeAssignee }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || 'Failed to reassign task');
        return;
      }

      toast.success('Task reassigned successfully');
      await refreshTask();
    } catch {
      toast.error('Failed to reassign task');
    } finally {
      setIsSavingAssignee(false);
    }
  };

  const handleCancelAssignee = () => {
    setActiveAssignee(task?.assigneeId || '');
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/tasks/${taskId}`, { method: 'DELETE' });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || 'Failed to delete task');
        return;
      }

      toast.success('Task deleted successfully');
      router.push('/tasks');
      router.refresh();
    } catch {
      toast.error('Failed to delete task');
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  const handleMarkCompleted = async () => {
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'COMPLETED' }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || 'Failed to update status');
        return;
      }

      toast.success('Task marked as completed - awaiting verification');
      await refreshTask();
    } catch {
      toast.error('Failed to update status');
    }
  };

  const handleVerify = async () => {
    setIsSubmittingVerification(true);
    try {
      const res = await fetch(`/api/tasks/${taskId}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ outcome: 'VERIFIED' }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || 'Failed to verify task');
        return;
      }

      toast.success('Task verified and closed');
      await refreshTask();
    } catch {
      toast.error('Failed to verify task');
    } finally {
      setIsSubmittingVerification(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      toast.error('Reason is required for rejection');
      return;
    }

    setIsSubmittingVerification(true);
    try {
      const res = await fetch(`/api/tasks/${taskId}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ outcome: 'REJECTED', reason: rejectionReason }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || 'Failed to reject task');
        return;
      }

      toast.success('Task rejected');
      await refreshTask();
      setShowRejectDialog(false);
      setRejectionReason('');
    } catch {
      toast.error('Failed to reject task');
    } finally {
      setIsSubmittingVerification(false);
    }
  };

  const handleAddComment = async () => {
    if (!commentText.trim()) {
      toast.error('Comment cannot be empty');
      return;
    }

    setIsSubmittingComment(true);
    try {
      const res = await fetch(`/api/tasks/${taskId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: commentText }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || 'Failed to add comment');
        return;
      }

      setCommentText('');
      await refreshTask();
    } catch {
      toast.error('Failed to add comment');
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleEditComment = async () => {
    if (!editText.trim()) {
      toast.error('Comment cannot be empty');
      return;
    }

    setIsSubmittingEdit(true);
    try {
      const res = await fetch(`/api/tasks/${taskId}/comments/${editingComment?.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: editText }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || 'Failed to edit comment');
        return;
      }

      setEditingComment(null);
      setEditText('');
      await refreshTask();
    } catch {
      toast.error('Failed to edit comment');
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}/comments/${commentId}`, {
        method: 'DELETE',
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || 'Failed to delete comment');
        return;
      }

      toast.success('Comment deleted');
      await refreshTask();
    } catch {
      toast.error('Failed to delete comment');
    }
  };

  const canEditComment = (comment: Comment) => {
    if (isManager) return true;
    if (user.role === 'TEAM_MEMBER') return comment.author.id === user.id;
    return false;
  };

  const canDeleteComment = (comment: Comment) => {
    if (isManager) return true;
    if (user.role === 'TEAM_MEMBER') return comment.author.id === user.id;
    return false;
  };

  const canAddComment = () => {
    if (user.role === 'VIEWER') return false;
    if (user.role === 'TEAM_MEMBER') return task?.assigneeId === user.id;
    return isManager;
  };

  if (loading || !task) {
    return (
      <div className="flex-1">
                <main className="max-w-7xl mx-auto w-full py-6 px-4 lg:px-6">
          <div className="text-center py-12">Loading task...</div>
        </main>
      </div>
    );
  }

  const isOverdue = new Date(task.dueDate) < new Date() && !['COMPLETED', 'CLOSED'].includes(task.status);

  const getPriorityVariant = (priority: string) => {
    switch (priority) {
      case 'URGENT': return 'destructive';
      case 'HIGH': return 'destructive';
      case 'MEDIUM': return 'default';
      case 'LOW': return 'secondary';
      default: return 'outline';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'NOT_STARTED': return 'Not Started';
      case 'IN_PROGRESS': return 'In Progress';
      case 'BLOCKED': return 'Blocked';
      case 'COMPLETED': return 'Completed';
      case 'CLOSED': return 'Closed';
      default: return status.replace('_', ' ');
    }
  };

  const canMarkCompleted = task.status !== 'CLOSED' && (task.assigneeId === user.id || isManager);
  const canChangeStatus = task.status !== 'CLOSED' && (task.assigneeId === user.id || isManager);

  const allowedNextStatuses = {
    NOT_STARTED: ['IN_PROGRESS', 'BLOCKED'],
    IN_PROGRESS: ['BLOCKED', 'COMPLETED'],
    BLOCKED: ['IN_PROGRESS'],
    COMPLETED: ['CLOSED', 'IN_PROGRESS'],
    CLOSED: [],
  } as const;

  const handleStatusChange = async (newStatus: string) => {
    if (newStatus === 'BLOCKED') {
      const reason = prompt('Enter blocked reason (required):');
      if (!reason?.trim()) {
        toast.error('Blocked reason is required');
        return;
      }
      try {
        const res = await fetch(`/api/tasks/${taskId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus, blockedReason: reason }),
        });
        const data = await res.json();
        if (!res.ok) {
          toast.error(data.error || 'Failed to update status');
          return;
        }
        toast.success(`Task marked as ${getStatusText(newStatus)}`);
        await refreshTask();
      } catch {
        toast.error('Failed to update status');
      }
    } else if (newStatus === 'COMPLETED') {
      // Handled by existing handleMarkCompleted
      await handleMarkCompleted();
    } else if (newStatus === 'IN_PROGRESS') {
      try {
        const res = await fetch(`/api/tasks/${taskId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus }),
        });
        const data = await res.json();
        if (!res.ok) {
          toast.error(data.error || 'Failed to update status');
          return;
        }
        toast.success(`Task marked as ${getStatusText(newStatus)}`);
        await refreshTask();
      } catch {
        toast.error('Failed to update status');
      }
    }
  };

  return (
    <div className="flex-1">
            <main className="max-w-7xl mx-auto w-full py-6 px-4 lg:px-6">
        <div className="mb-4">
          <Button asChild variant="ghost" size="sm">
            <a href="/tasks">â† Back to Task Register</a>
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <h2 className="text-xl font-bold">{task.title}</h2>
                    <p className="text-muted-foreground">{task.taskNumberDisplay}</p>
                  </div>
<div className="flex gap-2">
                    <Badge variant={getPriorityVariant(task.priority)}>
                      {task.priority}
                    </Badge>
                    {isOverdue && (
                      <Badge variant="destructive">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        Overdue
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {task.description && (
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{task.description}</p>
                )}

                {canEdit && (
                  <div className="flex gap-2">
                    <Button asChild size="sm" variant="outline">
                      <a href={`/tasks/${task.id}/edit`}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit Task
                      </a>
                    </Button>
                  </div>
                )}

                {/* Progress Bar - checklist-based */}
                <div>
                  <Label className="text-muted-foreground">Progress</Label>
                  <div className="mt-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-muted-foreground">
                        Checklist ({task.checklist.filter((i) => i.completed).length}/{task.checklist.length})
                      </span>
                      <span className="text-sm font-medium">
                        {task.percentComplete}%
                      </span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all duration-300"
                        style={{ width: `${task.percentComplete}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Blocked Reason */}
                {task.status === 'BLOCKED' && task.blockedReason && (
                  <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                    <Label className="text-destructive font-medium">Blocked Reason</Label>
                    <p className="text-sm mt-1">{task.blockedReason}</p>
                    {task.blockedAt && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Blocked on {new Date(task.blockedAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                )}

                {/* Estimated vs Actual Hours */}
                {(task.estimatedHours !== null && task.estimatedHours !== undefined) && (
                  <div>
                    <Label className="text-muted-foreground">Hours</Label>
                    <div className="mt-1 flex items-center gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Estimated: </span>
                        <span className="font-medium">{task.estimatedHours} hrs</span>
                      </div>
                      <div
                        className={`font-medium ${
                          task.actualHours > (task.estimatedHours || 0) ? 'text-destructive' : ''
                        }`}
                      >
                        <span className="text-muted-foreground">Actual: </span>
                        <span>{task.actualHours} hrs</span>
                        {task.actualHours > (task.estimatedHours || 0) && (
                          <span className="ml-1 text-destructive">(Over budget)</span>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <Label className="text-muted-foreground">Status</Label>
                    <div className="mt-1">
                      <StatusBadge status={task.status} />
                      <VerificationStatusBadge
                        verifiedAt={task.verifiedAt}
                        verifications={task.verifications}
                        taskStatus={task.status}
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="text-muted-foreground">Assignee</Label>
                    <div className="mt-1 flex items-center gap-2">
                      {task.assigneeId ? (
                        <>
                          <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center">
                            <UserCheck className="h-3 w-3" />
                          </div>
                          {task.assignee?.name ?? task.assignee?.email}
                        </>
                      ) : (
                        <span className="text-muted-foreground">Unassigned</span>
                      )}
                    </div>
                  </div>

                  <div>
                    <Label className="text-muted-foreground">Due Date</Label>
                    <div className="mt-1 flex items-center gap-1">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className={isOverdue ? 'text-destructive' : ''}>
                        {new Date(task.dueDate).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <div>
                    <Label className="text-muted-foreground">Created By</Label>
                    <div className="mt-1 text-sm">
                      {task.creator?.name ?? task.creator?.email}
                    </div>
                  </div>
                </div>

                {task.project && (
                  <div>
                    <Label className="text-muted-foreground">Project</Label>
                    <div className="mt-1 text-sm">{task.project.name}</div>
                  </div>
                )}

                {task.milestone && (
                  <div>
                    <Label className="text-muted-foreground">Milestone</Label>
                    <div className="mt-1 text-sm">
                      {task.milestone.name}
                      {task.milestone.phaseName && (
                        <span className="text-muted-foreground ml-2">({task.milestone.phaseName})</span>
                      )}
                    </div>
                  </div>
                )}

                {task.category && (
                  <div>
                    <Label className="text-muted-foreground">Category</Label>
                    <div className="mt-1 text-sm">{task.category.name}</div>
                  </div>
                )}

                {task.verifiedById && task.verifiedAt && (
                  <div>
                    <Label className="text-muted-foreground">Verified</Label>
                    <div className="mt-1">
                      <span className="text-sm">
                        Verified by {task.verifier?.name ?? task.verifier?.email} on {new Date(task.verifiedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                )}

                {/* Status Transition Buttons */}
                {canChangeStatus && allowedNextStatuses[task.status as keyof typeof allowedNextStatuses] && (
                  <div className="pt-4 border-t space-y-2">
                    <Label className="text-muted-foreground">Change Status</Label>
                    <div className="flex flex-wrap gap-2">
                      {allowedNextStatuses[task.status as keyof typeof allowedNextStatuses].map((nextStatus) => (
                        <Button
                          key={nextStatus}
                          variant="outline"
                          size="sm"
                          onClick={() => handleStatusChange(nextStatus)}
                          disabled={nextStatus === 'COMPLETED' && task.assigneeId !== user.id && !isManager}
                        >
                          {getStatusText(nextStatus)}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                {canMarkCompleted && task.status === 'IN_PROGRESS' && task.assigneeId === user.id && (
                  <div className="pt-4 border-t">
                    <Button onClick={handleMarkCompleted}>
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Mark as Completed
                    </Button>
                  </div>
                )}

                {canVerify && task.status === 'COMPLETED' && (
                  <div className="pt-4 border-t space-y-2">
                    <div className="flex gap-2">
                      <Button onClick={handleVerify} disabled={isSubmittingVerification}>
                        {isSubmittingVerification ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4 mr-2" />}
                        Verify
                      </Button>
                      <Button variant="outline" onClick={() => setShowRejectDialog(true)} disabled={isSubmittingVerification}>
                        <X className="h-4 w-4 mr-2" />
                        Reject
                      </Button>
                    </div>
                    <p className="text-sm text-muted-foreground">Mark this task as verified (CLOSED) or reject it back to in-progress.</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {canAssign && (
              <Card>
                <CardHeader>
                  <CardTitle>Assign Task</CardTitle>
                </CardHeader>
                <CardContent>
                  <Select value={activeAssignee || undefined} onValueChange={setActiveAssignee}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select assignee" />
                    </SelectTrigger>
                    <SelectContent>
                      {users.map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.name ?? u.email} ({u.role})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex gap-2 mt-4">
                    <Button onClick={handleSaveAssignee} disabled={isSavingAssignee || activeAssignee === task.assigneeId}>
                      {isSavingAssignee ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                      Save
                    </Button>
                    <Button variant="outline" onClick={handleCancelAssignee}>
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Comments ({task.comments.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {canAddComment() && (
                    <div className="flex gap-3">
                      <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                        <UserCheck className="h-4 w-4" />
                      </div>
                      <div className="flex-1">
                        <Textarea
                          placeholder="Write a comment..."
                          value={commentText}
                          onChange={(e) => setCommentText(e.target.value)}
                          rows={3}
                        />
                        <div className="flex justify-end mt-2">
                          <Button onClick={handleAddComment} disabled={isSubmittingComment || !commentText.trim()}>
                            {isSubmittingComment ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                            Add Comment
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {task.comments.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">No comments yet</p>
                  ) : (
                    <div className="space-y-4">
                      {task.comments.map((comment) => (
                        <div key={comment.id} className="flex gap-3">
                          <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                            <UserCheck className="h-4 w-4" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm">{comment.author?.name ?? comment.author?.email}</span>
                              <span className="text-xs text-muted-foreground">
                                {new Date(comment.createdAt).toLocaleDateString()}
                              </span>
                              {comment.editedAt && (
                                <Badge variant="outline" className="text-xs">edited</Badge>
                              )}
                            </div>
                            <p className="text-sm mt-1 whitespace-pre-wrap">{comment.content}</p>
                            <div className="flex items-center gap-2 mt-2">
                              {canEditComment(comment) && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setEditingComment(comment);
                                    setEditText(comment.content);
                                  }}
                                >
                                  <Edit className="h-3 w-3" />
                                </Button>
                              )}
                              {canDeleteComment(comment) && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleDeleteComment(comment.id)}
                                >
                                  <Delete className="h-3 w-3" />
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Verification History</CardTitle>
              </CardHeader>
              <CardContent>
                {task.verifications && task.verifications.length > 0 ? (
                  <div className="space-y-3">
                    {task.verifications.map((v) => (
                      <div key={v.id} className="border rounded-lg p-3">
                        <div className="flex items-center justify-between">
                          <VerificationBadge outcome={v.outcome} />
                          <span className="text-sm text-muted-foreground">
                            {new Date(v.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        {v.reason && (
                          <p className="text-sm mt-2">{v.reason}</p>
                        )}
                        <p className="text-sm text-muted-foreground mt-1">
                          By: {v.verifier?.name ?? v.verifier?.email}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No verification records yet</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                  <CardTitle>
                    <span>
                      Checklist ({task.checklist.filter((i) => i.completed).length}/{task.checklist.length})
                      {task.checklist.some((i) => i.isMandatory) && (
                        <Badge variant="outline" className="ml-2 text-xs">
                          {task.checklist.filter((i) => i.isMandatory).length} mandatory
                        </Badge>
                      )}
                    </span>
                    </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {task.checklist.length > 0 && (
                  <ProgressBar
                    value={(task.checklist.filter((i) => i.completed).length / task.checklist.length) * 100}
                    status={task.status}
                  />
                )}

                {isManager && (
                  <div className="flex gap-2 items-center">
                    <input
                      type="text"
                      value={newChecklistTitle}
                      onChange={(e) => setNewChecklistTitle(e.target.value)}
                      onKeyDown={async (e) => {
                        if (e.key === 'Enter' && newChecklistTitle.trim()) {
                          e.preventDefault();
                          await handleAddChecklistItem();
                        }
                      }}
                      placeholder="New checklist item..."
                      className="flex-1 px-3 py-2 border rounded-md text-sm"
                      disabled={isAddingChecklist}
                    />
                    <label className="flex items-center gap-1 text-sm cursor-pointer">
                      <Checkbox
                        checked={newChecklistMandatory}
                        onCheckedChange={(checked) => setNewChecklistMandatory(checked === true)}
                      />
                      <span>Mandatory</span>
                    </label>
                    <Button
                      size="sm"
                      onClick={handleAddChecklistItem}
                      disabled={isAddingChecklist || !newChecklistTitle.trim()}
                    >
                      {isAddingChecklist ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                    </Button>
                  </div>
                )}

                <div className="space-y-2">
                  {task.checklist.map((item) => (
                    <div key={item.id} className="flex items-center gap-3 p-2 border rounded-lg group">
                      {editingItem?.id === item.id ? (
                        <div className="flex-1 flex items-center gap-2">
                          <input
                            type="text"
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            onKeyDown={async (e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                await handleUpdateChecklistItem(item, editTitle, editMandatory);
                              }
                              if (e.key === 'Escape') {
                                setEditingItem(null);
                              }
                            }}
                            className="flex-1 px-2 py-1 border rounded text-sm"
                            autoFocus
                          />
                          <label className="flex items-center gap-1 text-xs cursor-pointer">
                            <Checkbox
                              checked={editMandatory}
                              onCheckedChange={(checked) => setEditMandatory(checked === true)}
                            />
                            Mandatory
                          </label>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={async () => {
                              await handleUpdateChecklistItem(item, editTitle, editMandatory);
                            }}
                            disabled={isSavingChecklist}
                          >
                            {isSavingChecklist ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setEditingItem(null)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <>
                          <Checkbox
                            checked={item.completed}
                            onCheckedChange={async (checked) => {
                               if (!canTick) return;
                               const newCompleted = checked === true;

                               const prevTask = { ...task };
                               if (task) {
                                 const updatedChecklist = task.checklist.map((ci) =>
                                   ci.id === item.id
                                     ? { ...ci, completed: newCompleted, doneAt: newCompleted ? new Date().toISOString() : null, userId: newCompleted ? user.id : null }
                                     : ci
                                 );
                                 const total = updatedChecklist.length;
                                 const done = updatedChecklist.filter((i) => i.completed).length;
                                 const allMandatoryDone = updatedChecklist
                                   .filter((i) => i.isMandatory)
                                   .every((i) => i.completed);
                                 const newPercent = total > 0 ? Math.round((done / total) * 100) : 0;

                                 setTask({
                                   ...task,
                                   checklist: updatedChecklist,
                                   percentComplete: newPercent,
                                   status: (allMandatoryDone && done === total) ? 'COMPLETED' : newCompleted ? task.status : task.status === 'COMPLETED' ? 'IN_PROGRESS' : task.status,
                                 });
                               }

                               try {
                                 const res = await fetch(`/api/tasks/${taskId}/checklist/${item.id}`, {
                                   method: 'PATCH',
                                   headers: { 'Content-Type': 'application/json' },
                                   body: JSON.stringify({ completed: newCompleted }),
                                 });
                                 if (!res.ok) {
                                   setTask(prevTask);
                                   const data = await res.json();
                                   toast.error(data.error || 'Failed to update item');
                                 } else {
                                   await refreshTask();
                                 }
                               } catch {
                                 setTask(prevTask);
                                 toast.error('Failed to update item');
                               }
                             }}
                            disabled={!canTick}
                          />
                          <span className={item.completed ? 'line-through text-muted-foreground flex-1' : 'flex-1'}>
                            {item.title}
                            {item.isMandatory && (
                              <Badge variant="secondary" className="ml-2 text-xs h-4">Mandatory</Badge>
                            )}
                            {item.completed && item.user && item.doneAt && (
                              <span className="ml-2 text-xs text-muted-foreground">
                                by {item.user.name ?? item.user.email} on {new Date(item.doneAt).toLocaleDateString()}
                              </span>
                            )}
                          </span>
                          {isManager && (
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setEditingItem(item);
                                  setEditTitle(item.title);
                                  setEditMandatory(item.isMandatory);
                                }}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={async () => {
                                  if (confirm('Delete this checklist item?')) {
                                    try {
                                      await fetch(`/api/tasks/${taskId}/checklist/${item.id}`, {
                                        method: 'DELETE',
                                      });
                                      await refreshTask();
                                    } catch {
                                      toast.error('Failed to delete item');
                                    }
                                  }
                                }}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  ))}
                  {task.checklist.length === 0 && (
                    <p className="text-sm text-muted-foreground">No checklist items yet</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {canDelete && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-destructive">Danger Zone</CardTitle>
                </CardHeader>
                <CardContent>
                  <Button variant="destructive" onClick={() => setShowDeleteDialog(true)}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Task
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="lg:col-span-1 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Attachments</CardTitle>
              </CardHeader>
              <CardContent>
                {attachments && attachments.length > 0 ? (
                  <div className="space-y-3">
                    {attachments.map((attachment) => (
                      <div key={attachment.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <FileText className="h-8 w-8 text-muted-foreground" />
                          <div>
                            <p className="font-medium text-sm">{attachment.fileName}</p>
                            <p className="text-xs text-muted-foreground">
                              {(attachment.size / 1024).toFixed(1)} KB â€¢ {attachment.uploadedBy?.name ?? attachment.uploadedBy?.email}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button asChild variant="ghost" size="sm">
                            <a href={attachment.filePath} target="_blank" rel="noopener noreferrer" download>
                              <Download className="h-4 w-4" />
                            </a>
                          </Button>
                          {canEdit && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteAttachment(attachment.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">No attachments yet</p>
                )}

                {canEdit && (
                  <div className="mt-4 pt-4 border-t">
                    <label className="flex items-center justify-center px-4 py-2 border-2 border-dashed border-muted rounded-lg cursor-pointer hover:bg-muted/25">
                      <input
                        type="file"
                        className="hidden"
                        accept=".pdf,.png,.jpg,.jpeg,.docx,.xlsx"
                        onChange={handleFileUpload}
                        disabled={isUploading}
                      />
                      <Plus className="h-4 w-4 mr-2" />
                      {isUploading ? 'Uploading...' : 'Add Attachment'}
                    </label>
                    <p className="text-xs text-muted-foreground mt-2">
                      Supported: PDF, PNG, JPG, DOCX, XLSX (max 10 MB)
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Task?</DialogTitle>
              <DialogDescription>
                This action will mark the task as deleted. Comments, checklist items, and verification records will be preserved but hidden. This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
                {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                Delete Task
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reject Task</DialogTitle>
              <DialogDescription>
                Please provide a reason for rejecting this task. The task will be sent back to In Progress.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <Textarea
                placeholder="Enter rejection reason..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={3}
              />
              {rejectionReason === '' && (
                <p className="text-sm text-destructive">Reason is required</p>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleReject} disabled={isSubmittingVerification}>
                {isSubmittingVerification ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Reject Task'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={editingComment !== null} onOpenChange={(open) => !open && setEditingComment(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Comment</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                rows={4}
              />
              {!editText.trim() && (
                <p className="text-sm text-destructive">Comment cannot be empty</p>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingComment(null)}>
                Cancel
              </Button>
              <Button onClick={handleEditComment} disabled={isSubmittingEdit || !editText.trim()}>
                {isSubmittingEdit ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}



















