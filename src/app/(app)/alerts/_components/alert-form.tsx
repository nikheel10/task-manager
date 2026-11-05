'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { X, Check, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertType,
  AlertStatus,
  Recurrence,
  Priority,
  EntityType,
  RegulatoryTemplate,
  Alert,
  UserOption,
  AlertEntityType,
} from '../types';
import { DEFAULT_REMINDER_RULES, DEFAULT_ESCALATION_RULES, REQUIRE_EVIDENCE_ON_COMPLETE } from '@/lib/alert-rules';

const ALERT_TYPES: { value: AlertType; label: string }[] = [
  { value: 'REGULATORY', label: 'Regulatory' },
  { value: 'STATUTORY', label: 'Statutory' },
  { value: 'LICENSE_RENEWAL', label: 'License Renewal' },
  { value: 'CONTRACT_RENEWAL', label: 'Contract Renewal' },
  { value: 'INSURANCE', label: 'Insurance' },
  { value: 'INSPECTION', label: 'Inspection' },
  { value: 'COMPLIANCE_FILING', label: 'Compliance Filing' },
];

const ENTITY_TYPES: { value: EntityType; label: string }[] = [
  { value: 'COMPANY', label: 'Company' },
  { value: 'SITE', label: 'Site' },
  { value: 'ASSET', label: 'Asset' },
  { value: 'PROJECT', label: 'Project' },
  { value: 'OTHER', label: 'Other' },
];

const PRIORITIES: { value: Priority; label: string }[] = [
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
  { value: 'URGENT', label: 'Urgent' },
];

const STATUSES: { value: AlertStatus; label: string }[] = [
  { value: 'OPEN', label: 'Open' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'SUBMITTED', label: 'Submitted' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'OVERDUE', label: 'Overdue' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

const RECURRENCE_TYPES: { value: Recurrence; label: string }[] = [
  { value: 'ONE_TIME', label: 'One-time' },
  { value: 'MONTHLY', label: 'Monthly' },
  { value: 'QUARTERLY', label: 'Quarterly' },
  { value: 'ANNUAL', label: 'Annual' },
  { value: 'CUSTOM', label: 'Custom' },
];

export interface AlertFormProps {
  user: { id: string; name: string; email: string; role: string };
  alertId?: string;
}

export function AlertForm({ user, alertId }: AlertFormProps) {
  const router = useRouter();
  const isEditMode = !!alertId;
  const isManager = user.role === 'SUPER_ADMIN' || user.role === 'MANAGER';

  const [formData, setFormData] = useState({
    title: '',
    reference: '',
    description: '',
    type: 'REGULATORY' as AlertType,
    priority: 'MEDIUM' as Priority,
    entityId: '',
    ownerId: user.id,
    regulatoryClause: '',
    triggerDate: new Date().toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
    recurrence: 'ONE_TIME' as Recurrence,
    recurrenceIntervalDays: '',
    recurrenceEndDate: '',
    status: 'OPEN' as AlertStatus,
    evidenceRequired: REQUIRE_EVIDENCE_ON_COMPLETE,
  });

  const [reminderRules, setReminderRules] = useState<{ daysBefore: number; isActive: boolean }[]>(
    DEFAULT_REMINDER_RULES.map((r) => ({ ...r }))
  );
  const [escalationRules, setEscalationRules] = useState<Array<{
    afterDaysOverdue: number;
    escalateToRole: string | null;
    escalateToUserId: string | null;
    isActive: boolean;
  }>>(
    DEFAULT_ESCALATION_RULES.map((r) => ({ ...r, escalateToUserId: null }))
  );

  const [entities, setEntities] = useState<AlertEntityType[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [templates, setTemplates] = useState<RegulatoryTemplate[]>([]);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchData();
    if (isEditMode && alertId) {
      fetchAlert(alertId);
    }
  }, [isEditMode, alertId]);

  const fetchData = async () => {
    try {
      const entitiesRes = await fetch('/api/entities').then((r) => r.ok ? r.json() : { entities: [] });
      setEntities(entitiesRes.entities || entitiesRes || []);
    } catch (error) {
      console.error('Failed to fetch entities:', error);
    }

    try {
      const usersRes = await fetch('/api/users/eligible').then((r) => r.ok ? r.json() : []);
      setUsers(usersRes || []);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }

    try {
      const templatesRes = await fetch('/api/regulatory-templates').then((r) => r.ok ? r.json() : []);
      setTemplates(templatesRes.templates || templatesRes || []);
    } catch (error) {
      console.error('Failed to fetch templates:', error);
    }
  };

  const fetchAlert = async (id: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/alerts/${id}`);
      if (res.ok) {
        const alert: Alert = await res.json();
        setFormData({
          title: alert.title,
          reference: alert.reference || '',
          description: alert.description || '',
          type: alert.type,
          priority: alert.priority,
          entityId: alert.entityId,
          ownerId: alert.ownerId,
          regulatoryClause: alert.regulatoryClause || '',
          triggerDate: new Date(alert.triggerDate).toISOString().split('T')[0],
          dueDate: new Date(alert.dueDate).toISOString().split('T')[0],
          recurrence: alert.recurrence,
          recurrenceIntervalDays: alert.recurrenceIntervalDays?.toString() || '',
          recurrenceEndDate: alert.recurrenceEndDate
            ? new Date(alert.recurrenceEndDate).toISOString().split('T')[0]
            : '',
          status: alert.status,
          evidenceRequired: REQUIRE_EVIDENCE_ON_COMPLETE,
        });

        if (alert.reminderRules && alert.reminderRules.length > 0) {
          setReminderRules(
            alert.reminderRules.map((r) => ({ daysBefore: r.daysBefore, isActive: r.isActive }))
          );
        }
        if (alert.escalationRules && alert.escalationRules.length > 0) {
          setEscalationRules(
             alert.escalationRules.map((r) => ({
               afterDaysOverdue: r.afterDaysOverdue,
               escalateToRole: r.escalateToRole,
               escalateToUserId: r.escalateToUserId ?? null,
               isActive: r.isActive,
            }))
          );
        }
      }
    } catch (error) {
      toast.error('Failed to load alert');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleReminderToggle = (daysBefore: number) => {
    setReminderRules((prev) =>
      prev.map((r) =>
        r.daysBefore === daysBefore ? { ...r, isActive: !r.isActive } : r
      )
    );
  };

  const handleRemoveReminder = (daysBefore: number) => {
    setReminderRules((prev) => prev.filter((r) => r.daysBefore !== daysBefore));
  };

  const addReminder = () => {
    const daysBefore = 7;
    setReminderRules((prev) => [...prev, { daysBefore, isActive: true }]);
  };

  const handleEscalationChange = (index: number, field: string, value: unknown) => {
    setEscalationRules((prev) =>
      prev.map((r, i) => (i === index ? { ...r, [field]: value, escalateToUserId: r.escalateToUserId ?? null } : r))
    );
  };

  const handleRemoveEscalation = (index: number) => {
    setEscalationRules((prev) => prev.filter((_, i) => i !== index));
  };

  const addEscalation = () => {
    setEscalationRules((prev) => [
      ...prev,
      { afterDaysOverdue: 14, escalateToRole: 'MANAGER', escalateToUserId: null, isActive: true },
    ]);
  };

  const handleTemplateSelect = (template: RegulatoryTemplate) => {
    setFormData((prev) => ({
      ...prev,
      title: template.title,
      type: template.type,
      regulatoryClause: template.regulatoryClause,
    }));
    setShowTemplateDialog(false);
    toast.success(`Loaded template: ${template.title}`);
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.title.trim()) newErrors.title = 'Title is required';
    if (!formData.entityId) newErrors.entityId = 'Entity is required';
    if (!formData.ownerId) newErrors.ownerId = 'Owner is required';

    const dueDate = new Date(formData.dueDate);
    const triggerDate = new Date(formData.triggerDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (dueDate < today) newErrors.dueDate = 'Due date cannot be in the past';
    if (triggerDate > dueDate) newErrors.triggerDate = 'Trigger date must be before or equal to due date';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (status?: AlertStatus) => {
    if (!validate()) return;

    setLoading(true);
    try {
      const payload = {
        ...formData,
        triggerDate: new Date(formData.triggerDate).toISOString(),
        dueDate: new Date(formData.dueDate).toISOString(),
        recurrenceIntervalDays: formData.recurrence === 'CUSTOM' ? Number(formData.recurrenceIntervalDays) : undefined,
        recurrenceEndDate: formData.recurrenceEndDate ? new Date(formData.recurrenceEndDate).toISOString() : undefined,
        reminderRules: { upsert: reminderRules.filter((r) => r.isActive).map((r) => ({ daysBefore: r.daysBefore })) },
        escalationRules: { upsert: escalationRules.filter((r) => r.isActive).map((r) => ({
          afterDaysOverdue: r.afterDaysOverdue,
          escalateToRole: r.escalateToRole || 'MANAGER',
        })) },
        status: status || formData.status,
      };

      const url = isEditMode ? `/api/alerts/${alertId}` : '/api/alerts';
      const method = isEditMode ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const result = await res.json();
        toast.success(isEditMode ? 'Alert updated' : 'Alert created');
        router.push(`/alerts`);
      } else {
        const error = await res.json();
        if (error.fieldErrors) {
          setErrors(error.fieldErrors);
        } else {
          toast.error(error.error || 'Failed to save alert');
        }
      }
    } catch (error) {
      toast.error('Failed to save alert');
    } finally {
      setLoading(false);
    }
  };

  if (loading && isEditMode && !formData.title) {
    return (
      <div className="flex-1">
                <main className="max-w-7xl mx-auto w-full py-6 px-4 lg:px-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-3/4" />
            <div className="h-96 bg-muted rounded" />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex-1">
            <main className="max-w-7xl mx-auto w-full py-6 px-4 lg:px-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold tracking-tight">
            {isEditMode ? 'Edit Alert' : 'New Alert'}
          </h1>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.push('/alerts')}>
              Cancel
            </Button>
            {!isManager && (
              <Badge variant="secondary">TEAM_MEMBER (Read-only mode)</Badge>
            )}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Info */}
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Label>Title *</Label>
                    <Input
                      value={formData.title}
                      onChange={(e) => handleChange('title', e.target.value)}
                      className={errors.title ? 'border-destructive' : ''}
                    />
                    {errors.title && <p className="text-xs text-destructive">{errors.title}</p>}
                  </div>
                  <div>
                    <Label>Reference</Label>
                    <Input
                      value={formData.reference}
                      onChange={(e) => handleChange('reference', e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  <div className="flex-1">
                    <Label>Type *</Label>
                    <Select
                      value={formData.type}
                      onValueChange={(v) => handleChange('type', v)}
                    >
                      <SelectTrigger className={errors.type ? 'border-destructive' : ''}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ALERT_TYPES.map((t) => (
                          <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.type && <p className="text-xs text-destructive">{errors.type}</p>}
                  </div>
                  <div>
                    <Label>Priority *</Label>
                    <Select
                      value={formData.priority}
                      onValueChange={(v) => handleChange('priority', v)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PRIORITIES.map((p) => (
                          <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label>Regulatory Clause</Label>
                  <Input
                    value={formData.regulatoryClause}
                    onChange={(e) => handleChange('regulatoryClause', e.target.value)}
                    placeholder="e.g., 17 CFR 249.20"
                  />
                  <div className="mt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowTemplateDialog(true)}
                    >
                      Load from Template
                    </Button>
                  </div>
                </div>

                <div>
                  <Label>Description</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => handleChange('description', e.target.value)}
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Entity & Owner */}
            <Card>
              <CardHeader>
                <CardTitle>Entity & Assignment</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Entity *</Label>
                  <Select
                    value={formData.entityId}
                    onValueChange={(v) => handleChange('entityId', v)}
                  >
                    <SelectTrigger className={errors.entityId ? 'border-destructive' : ''}>
                      <SelectValue placeholder="Select entity" />
                    </SelectTrigger>
                    <SelectContent>
                      {entities.map((e) => (
                        <SelectItem key={e.id} value={e.id}>
                          {e.name} ({e.type})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.entityId && <p className="text-xs text-destructive">{errors.entityId}</p>}
                </div>

                <div>
                  <Label>Owner *</Label>
                  <Select
                    value={formData.ownerId}
                    onValueChange={(v) => handleChange('ownerId', v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {users.map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.name || u.email} ({u.role.toLowerCase()})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Dates */}
            <Card>
              <CardHeader>
                <CardTitle>Dates</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Trigger Date</Label>
                    <Input
                      type="date"
                      value={formData.triggerDate}
                      onChange={(e) => handleChange('triggerDate', e.target.value)}
                      className={errors.triggerDate ? 'border-destructive' : ''}
                    />
                    {errors.triggerDate && <p className="text-xs text-destructive">{errors.triggerDate}</p>}
                  </div>
                  <div>
                    <Label>Due Date *</Label>
                    <Input
                      type="date"
                      value={formData.dueDate}
                      onChange={(e) => handleChange('dueDate', e.target.value)}
                      className={errors.dueDate ? 'border-destructive' : ''}
                    />
                    {errors.dueDate && <p className="text-xs text-destructive">{errors.dueDate}</p>}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recurrence */}
            <Card>
              <CardHeader>
                <CardTitle>Recurrence</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Recurrence Type</Label>
                  <Select
                    value={formData.recurrence}
                    onValueChange={(v) => handleChange('recurrence', v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {RECURRENCE_TYPES.map((r) => (
                        <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {formData.recurrence === 'CUSTOM' && (
                  <div>
                    <Label>Interval (days)</Label>
                    <Input
                      type="number"
                      value={formData.recurrenceIntervalDays}
                      onChange={(e) => handleChange('recurrenceIntervalDays', e.target.value)}
                      placeholder="e.g., 45"
                    />
                  </div>
                )}

                {formData.recurrence !== 'ONE_TIME' && (
                  <div>
                    <Label>End Date (optional)</Label>
                    <Input
                      type="date"
                      value={formData.recurrenceEndDate}
                      onChange={(e) => handleChange('recurrenceEndDate', e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      After this date, no new occurrences will be generated.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Reminder Rules */}
            <Card>
              <CardHeader>
                <CardTitle>Reminder Schedule</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2 mb-3">
                  {reminderRules.map((rule, index) => (
                    <div key={rule.daysBefore + '_' + index} className="flex items-center gap-1 bg-muted px-2 py-1 rounded">
                      <Checkbox
                        checked={rule.isActive}
                        onCheckedChange={(checked) => {
                          setReminderRules((prev) =>
                            prev.map((r) =>
                              r.daysBefore === rule.daysBefore ? { ...r, isActive: !!checked } : r
                            )
                          );
                        }}
                      />
                      <span className="text-sm">{rule.daysBefore} days before</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveReminder(rule.daysBefore)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
                <Button variant="outline" size="sm" onClick={addReminder}>
                  <Plus className="h-4 w-4 mr-1" /> Add Reminder
                </Button>
              </CardContent>
            </Card>

            {/* Escalation Rules */}
            <Card>
              <CardHeader>
                <CardTitle>
                  <div className="flex items-center justify-between">
                    <span>Escalation Rules</span>
                    <Button variant="outline" size="sm" onClick={addEscalation}>
                      <Plus className="h-4 w-4 mr-1" /> Add Rule
                    </Button>
                  </div>
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  Defines escalation behavior for overdue alerts.
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {escalationRules.map((rule, index) => (
                    <div key={index} className="flex items-end gap-3 p-3 border rounded">
                      <div className="flex-1">
                        <Label>After (days overdue)</Label>
                        <Input
                          type="number"
                          value={rule.afterDaysOverdue}
                          onChange={(e) => handleEscalationChange(index, 'afterDaysOverdue', Number(e.target.value))}
                        />
                      </div>
                      <div className="flex-1">
                        <Label>Escalate To</Label>
                        <Select
                          value={rule.escalateToRole || 'MANAGER'}
                          onValueChange={(v) => handleEscalationChange(index, 'escalateToRole', v)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="MANAGER">Manager</SelectItem>
                            <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleRemoveEscalation(index)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}

                  {escalationRules.length === 0 && (
                    <p className="text-sm text-muted-foreground">No escalation rules configured.</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right sidebar - status selector */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>
                  {isEditMode ? 'Update Status' : 'Initial Status'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Select
                  value={formData.status}
                  onValueChange={(v) => handleChange('status', v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUSES.filter((s) => {
                      if (s.value === 'COMPLETED' || s.value === 'OVERDUE') {
                        return false;
                      }
                      return true;
                    }).map((s) => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-2">
                  Use the Complete button on the alert detail to mark as completed.
                </p>
              </CardContent>
            </Card>

            <Card className="mt-4">
              <CardHeader>
                <CardTitle>Evidence</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="evidenceRequired"
                      checked={formData.evidenceRequired}
                      onCheckedChange={(checked) => handleChange('evidenceRequired', !!checked)}
                    />
                    <Label htmlFor="evidenceRequired" className="text-sm">
                      Require evidence on completion
                    </Label>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    When enabled, the alert cannot be completed without evidence files.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="mt-4">
              <CardHeader>
                <CardTitle>Preview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <p><span className="font-medium">Type:</span> {ALERT_TYPES.find((t) => t.value === formData.type)?.label}</p>
                  <p><span className="font-medium">Priority:</span> {PRIORITIES.find((p) => p.value === formData.priority)?.label}</p>
                  <p><span className="font-medium">Recurrence:</span> {RECURRENCE_TYPES.find((r) => r.value === formData.recurrence)?.label}</p>
                  <p><span className="font-medium">Reminders:</span> {reminderRules.filter((r) => r.isActive).map((r) => `${r.daysBefore}d`).join(', ') || 'None'}</p>
                  <p><span className="font-medium">Escalation:</span> {escalationRules.length} rule(s)</p>
                </div>
              </CardContent>
            </Card>

            <Button
              className="w-full mt-4"
              onClick={() => handleSubmit()}
              disabled={loading}
            >
              {loading ? 'Saving...' : isEditMode ? 'Update Alert' : 'Create Alert'}
            </Button>
          </div>
        </div>

        {/* Template Dialog */}
        <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Select Regulatory Template</DialogTitle>
              <DialogDescription>
                Choose a template to pre-fill the alert form with regulatory details.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {templates.map((template) => (
                <Card
                  key={template.id}
                  className="cursor-pointer hover:bg-accent transition-colors"
                  onClick={() => handleTemplateSelect(template)}
                >
                  <CardContent className="pt-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-medium">{template.title}</h3>
                        <p className="text-sm text-muted-foreground">{template.regulatoryClause}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {ALERT_TYPES.find((t) => t.value === template.type)?.label || template.type}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {template.jurisdiction}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            Default lead: {template.defaultLeadDays} days
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {templates.length === 0 && (
                <p className="text-center text-muted-foreground py-4">
                  No templates available
                </p>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}


