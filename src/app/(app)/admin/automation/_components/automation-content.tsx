'use client';

import { useState, useEffect } from 'react';
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
import { Trash2, Plus, Save, Check } from 'lucide-react';
import { toast } from 'sonner';
import { formatDateTime } from '@/lib/utils';

interface ReminderRule {
  id: string;
  daysBefore: number;
  isActive: boolean;
}

interface EscalationRule {
  id: string;
  afterDaysOverdue: number;
  escalateToRole: string | null;
  isActive: boolean;
}

interface AutomationContentProps {
  user: { id: string; name: string; email: string; role: string };
}

export function AutomationContent({ user }: AutomationContentProps) {
  const [reminderRules, setReminderRules] = useState<ReminderRule[]>([]);
  const [escalationRules, setEscalationRules] = useState<EscalationRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newReminderDays, setNewReminderDays] = useState('');
  const [newEscalationDays, setNewEscalationDays] = useState('');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const [remindersRes, escalationsRes] = await Promise.all([
        fetch('/api/settings/reminder-rules'),
        fetch('/api/settings/escalation-rules'),
      ]);

      if (remindersRes.ok) {
        const data = await remindersRes.json();
        setReminderRules(data || []);
      }
      if (escalationsRes.ok) {
        const data = await escalationsRes.json();
        setEscalationRules(data || []);
      }
    } catch (error) {
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const saveReminders = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/settings/reminder-rules', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reminderRules),
      });

      if (res.ok) {
        toast.success('Reminder rules saved');
      } else {
        const error = await res.json();
        toast.error(error.error || 'Failed to save reminder rules');
      }
    } catch (error) {
      toast.error('Failed to save reminder rules');
    } finally {
      setSaving(false);
    }
  };

  const saveEscalations = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/settings/escalation-rules', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(escalationRules),
      });

      if (res.ok) {
        toast.success('Escalation rules saved');
      } else {
        const error = await res.json();
        toast.error(error.error || 'Failed to save escalation rules');
      }
    } catch (error) {
      toast.error('Failed to save escalation rules');
    } finally {
      setSaving(false);
    }
  };

  const addReminder = () => {
    const days = parseInt(newReminderDays, 10);
    if (isNaN(days) || days < 1) {
      toast.error('Please enter a valid number of days');
      return;
    }
    if (reminderRules.some((r) => r.daysBefore === days)) {
      toast.error(`Reminder for ${days} days already exists`);
      return;
    }
    setReminderRules((prev) => [...prev, { id: '', daysBefore: days, isActive: true }]);
    setNewReminderDays('');
  };

  const removeReminder = (daysBefore: number) => {
    setReminderRules((prev) => prev.filter((r) => r.daysBefore !== daysBefore));
  };

  const addEscalation = () => {
    const days = parseInt(newEscalationDays, 10);
    if (isNaN(days) || days < 1) {
      toast.error('Please enter a valid number of days');
      return;
    }
    setEscalationRules((prev) => [
      ...prev,
      { id: '', afterDaysOverdue: days, escalateToRole: 'MANAGER', isActive: true },
    ]);
    setNewEscalationDays('');
  };

  const removeEscalation = (index: number) => {
    setEscalationRules((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="flex-1">
            <main className="max-w-7xl mx-auto w-full py-6 px-4 lg:px-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Automation Settings</h1>
            <p className="text-muted-foreground">
              Configure global reminder schedules and escalation rules
            </p>
          </div>
          <Badge variant="outline">{user.role}</Badge>
        </div>

        {loading ? (
          <div className="space-y-4">
            <div className="h-64 bg-muted rounded animate-pulse" />
            <div className="h-64 bg-muted rounded animate-pulse" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Reminder Rules */}
            <Card>
              <CardHeader>
                <CardTitle>Default Reminder Schedule</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Days before due date to send reminders. These are applied to new alerts.
                </p>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2 mb-4">
                  {reminderRules.map((rule) => (
                    <div key={rule.id || `new-${rule.daysBefore}`} className="flex items-center gap-2 bg-muted px-3 py-2 rounded">
                      <Badge variant={rule.isActive ? "default" : "secondary"} className="text-xs">
                        {rule.daysBefore} days
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setReminderRules((prev) =>
                            prev.map((r) =>
                              r.daysBefore === rule.daysBefore ? { ...r, isActive: !r.isActive } : r
                            )
                          )
                        }
                      >
                        {rule.isActive ? 'Active' : 'Inactive'}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeReminder(rule.daysBefore)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                  {reminderRules.length === 0 && (
                    <p className="text-sm text-muted-foreground">No reminder rules configured</p>
                  )}
                </div>

                <div className="flex gap-2">
                  <Input
                    type="number"
                    placeholder="e.g., 7"
                    value={newReminderDays}
                    onChange={(e) => setNewReminderDays(e.target.value)}
                    className="w-32"
                    min="1"
                  />
                  <Button size="sm" onClick={addReminder}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add Reminder
                  </Button>
                </div>

                <div className="flex justify-end mt-4">
                  <Button onClick={saveReminders} disabled={saving}>
                    <Save className="h-4 w-4 mr-2" />
                    Save Reminder Rules
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Escalation Rules */}
            <Card>
              <CardHeader>
                <CardTitle>Default Escalation Rules</CardTitle>
                <p className="text-sm text-muted-foreground">
                  When an alert becomes overdue, escalate to the specified role after N days.
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 mb-4">
                  {escalationRules.map((rule, index) => (
                    <div key={index} className="flex items-end gap-3 p-3 border rounded">
                      <div className="flex-1">
                        <Label>Days Overdue</Label>
                        <Input
                          type="number"
                          value={rule.afterDaysOverdue}
                          onChange={(e) =>
                            setEscalationRules((prev) =>
                              prev.map((r, i) =>
                                i === index
                                  ? { ...r, afterDaysOverdue: Number(e.target.value) }
                                  : r
                              )
                            )
                          }
                          min="1"
                        />
                      </div>
                      <div className="flex-1">
                        <Label>Escalate To Role</Label>
                        <Select
                          value={rule.escalateToRole || 'MANAGER'}
                          onValueChange={(v) =>
                            setEscalationRules((prev) =>
                              prev.map((r, i) =>
                                i === index ? { ...r, escalateToRole: v } : r
                              )
                            )
                          }
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
                          variant="ghost"
                          size="sm"
                          onClick={() => removeEscalation(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {escalationRules.length === 0 && (
                    <p className="text-sm text-muted-foreground">No escalation rules configured</p>
                  )}
                </div>

                <div className="flex gap-2">
                  <Input
                    type="number"
                    placeholder="e.g., 7"
                    value={newEscalationDays}
                    onChange={(e) => setNewEscalationDays(e.target.value)}
                    className="w-32"
                    min="1"
                  />
                  <Button size="sm" onClick={addEscalation}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add Escalation
                  </Button>
                </div>

                <div className="flex justify-end mt-4">
                  <Button onClick={saveEscalations} disabled={saving}>
                    <Save className="h-4 w-4 mr-2" />
                    Save Escalation Rules
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}


