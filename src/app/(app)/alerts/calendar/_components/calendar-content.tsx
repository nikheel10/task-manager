'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ChevronLeft, ChevronRight, BarChart3, UserCheck } from 'lucide-react';
import { toast } from 'sonner';
import { Alert, Priority } from '../../types';
import { cn } from '@/lib/utils';
import { StatusBadge } from '@/components/ui/amc/status-badge';
import { ProgressBar } from '@/components/ui/amc/progress-bar';
import Link from 'next/link';
import { format } from 'date-fns';

interface CalendarContentProps {
  user: { id: string; name: string; email: string; role: string };
}

interface CalendarTask {
  id: string;
  taskNumber: number;
  taskNumberDisplay: string;
  title: string;
  status: string;
  priority: string;
  percentComplete: number;
  assignee: { id: string; name?: string | null; email: string } | null;
  dueDate: string;
}

interface CalendarItem {
  id: string;
  type: 'task' | 'alert';
  title: string;
  priority: Priority;
  status: string;
  assignee: { name?: string | null; email: string } | null;
  percentComplete: number | null;
  dateKey: string;
  href: string;
  alertNumber?: number;
}

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function CalendarContent({ user }: CalendarContentProps) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [tasks, setTasks] = useState<CalendarTask[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDateItems, setSelectedDateItems] = useState<CalendarItem[]>([]);
  const [selectedDateLabel, setSelectedDateLabel] = useState('');

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const startDayOfWeek = firstDayOfMonth.getDay();
  const daysInMonth = lastDayOfMonth.getDate();

  const days = [];
  for (let i = 0; i < startDayOfWeek; i++) {
    days.push({ day: null, date: new Date(year, month, -(startDayOfWeek - i - 1)) });
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push({ day: i, date: new Date(year, month, i) });
  }

  const fetchAlertsAndTasks = useCallback(async () => {
    try {
      const res = await fetch('/api/alerts?limit=100');
      if (res.ok) {
        const data = await res.json();
        setAlerts(data.alerts || []);
      }
    } catch {
      toast.error('Failed to load alerts');
    }

    try {
      const res = await fetch('/api/tasks?limit=200');
      if (res.ok) {
        const data = await res.json();
        setTasks(data.tasks || []);
      }
    } catch {
      toast.error('Failed to load tasks');
    }
  }, []);

  useEffect(() => {
    fetchAlertsAndTasks();
  }, [fetchAlertsAndTasks]);

  const itemsByDate = useMemo(() => {
    const map = new Map<string, CalendarItem[]>();

    alerts.forEach((alert) => {
      const dateKey = new Date(alert.dueDate).toISOString().split('T')[0];
      const arr = map.get(dateKey) || [];
       arr.push({
        id: alert.id,
        type: 'alert',
        title: alert.title,
        priority: alert.priority,
        status: alert.status,
        assignee: alert.owner ? { name: alert.owner.name, email: alert.owner.email } : null,
        percentComplete: alert.status === 'COMPLETED' ? 100 : alert.status === 'IN_PROGRESS' ? 50 : 0,
        dateKey,
        href: `/alerts/${alert.id}`,
        alertNumber: alert.alertNumber,
      });
      map.set(dateKey, arr);
    });

    tasks.forEach((task) => {
      const dateKey = new Date(task.dueDate).toISOString().split('T')[0];
      const arr = map.get(dateKey) || [];
      arr.push({
        id: task.id,
        type: 'task',
        title: task.title,
        priority: task.priority as Priority,
        status: task.status,
        assignee: task.assignee,
        percentComplete: task.percentComplete ?? null,
        dateKey,
        href: `/tasks/${task.id}`,
      });
      map.set(dateKey, arr);
    });

    return map;
  }, [alerts, tasks]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const getPriorityVariant = (priority: Priority) => {
    switch (priority) {
      case 'URGENT': return 'destructive';
      case 'HIGH': return 'destructive';
      case 'MEDIUM': return 'warning';
      case 'LOW': return 'secondary';
      default: return 'outline';
    }
  };

   const navigateMonth = (delta: number) => {
    const newDate = new Date(year, month + delta, 1);
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const openDateDetails = (dateKey: string, date: Date) => {
    const items = itemsByDate.get(dateKey) || [];
    setSelectedDateItems(items);
    setSelectedDateLabel(format(date, 'dd MMM yyyy') + ` - ${items.length} ${items.length === 1 ? 'item' : 'items'}`);
  };

  const closeDateDetails = () => {
    setSelectedDateItems([]);
    setSelectedDateLabel('');
  };

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeDateDetails();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  return (
    <div className="flex-1">
      <main className="max-w-7xl mx-auto w-full py-6 px-4 lg:px-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Calendar</h1>
            <p className="text-muted-foreground">
              View tasks and alerts by due date on a monthly calendar
            </p>
          </div>
          <Button variant="outline" onClick={goToToday}>
            Today
          </Button>
        </div>

        <div className="flex items-center justify-between mb-4">
          <Button variant="ghost" size="sm" onClick={() => navigateMonth(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2">
            <Select
              value={String(month)}
              onValueChange={(v) => setCurrentDate(new Date(year, Number(v), 1))}
            >
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MONTH_NAMES.map((name, i) => (
                  <SelectItem key={i} value={String(i)}>{name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={String(year)}
              onValueChange={(v) => setCurrentDate(new Date(Number(v), month, 1))}
            >
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 7 }, (_, i) => year - 3 + i).map((y) => (
                  <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button variant="ghost" size="sm" onClick={() => navigateMonth(1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-7 gap-px bg-border rounded overflow-hidden">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <div key={day} className="bg-muted p-2 text-center text-xs font-medium text-muted-foreground">
                  {day}
                </div>
              ))}

              {days.map((dayObj, i) => {
                const dateKey = dayObj.date.toISOString().split('T')[0];
                const dayItems = dayObj.day ? (itemsByDate.get(dateKey) || []) : [];
                const isToday = dayObj.date.getTime() === today.getTime();
                const isCurrentMonth = dayObj.date.getMonth() === month;

                return (
                  <div
                    key={i}
                    className={`min-h-[100px] p-1 bg-background relative ${
                      !isCurrentMonth ? 'opacity-40' : ''
                    }`}
                  >
                    {dayObj.day && (
                      <>
                        <button
                          type="button"
                          onClick={() => openDateDetails(dateKey, dayObj.date)}
                          className={`text-xs font-medium cursor-pointer hover:underline ${
                            isToday ? 'bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center' : ''
                          }`}
                        >
                          {dayObj.day}
                        </button>
                        <div className="space-y-1 mt-1">
                           {dayItems.slice(0, 3).map((item) => (
                             <button
                               key={item.id}
                               type="button"
                               onClick={() => openDateDetails(dateKey, dayObj.date)}
                               className={cn(
                                 "block w-full cursor-pointer text-left",
                                 item.type === 'alert'
                                   ? "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded p-1.5"
                                   : ""
                               )}
                             >
                               <Badge
                                 variant={item.type === 'alert' ? 'destructive' : getPriorityVariant(item.priority)}
                                 className={cn(
                                   "text-xs w-full truncate",
                                   item.type === 'alert' ? 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900/30 dark:text-red-200' : ''
                                 )}
                                 title={item.title}
                               >
                                 {item.type === 'task' ? `#${item.id.slice(-6)}` : `ALT-${String(item.alertNumber || 0).padStart(4, '0')}`}
                               </Badge>
                               <div className="text-xs truncate mt-0.5" title={item.title}>
                                 {item.title}
                               </div>
                             </button>
                           ))}
                          {dayItems.length > 3 && (
                            <button
                              type="button"
                              onClick={() => openDateDetails(dateKey, dayObj.date)}
                              className="text-xs text-muted-foreground hover:text-foreground hover:underline cursor-pointer"
                            >
                              +{dayItems.length - 3} more
                            </button>
                          )}
                          {dayItems.length === 0 && dayObj.day && (
                            <div className="text-xs text-muted-foreground opacity-50">—</div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Side Panel Popover - rendered outside the overflow-hidden grid */}
      <Dialog open={selectedDateItems.length > 0} onOpenChange={closeDateDetails}>
        <DialogContent className="sm:max-w-2xl p-0 gap-0">
          <DialogHeader className="p-6 pb-4 border-b">
            <DialogTitle className="text-lg font-semibold pr-8">
              {selectedDateLabel}
            </DialogTitle>
          </DialogHeader>
          <div className="max-h-[500px] overflow-y-auto p-4">
            {selectedDateItems.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No items for this date</p>
            ) : (
              <div className="space-y-3">
   {selectedDateItems.map((item) => (
                   <div
                     key={item.id}
                     className={cn(
                       "block p-3 border rounded-lg hover:bg-muted/50 transition-colors",
                       item.type === 'alert' ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' : ''
                     )}
                   >
                     <div className="flex items-start justify-between gap-3">
                       <div className="flex-1 min-w-0">
                         <div className="flex items-center gap-2 mb-1 flex-wrap">
                           <Badge variant={getPriorityVariant(item.priority)} className="text-xs">
                             {item.priority}
                           </Badge>
                           <Badge variant="outline" className="text-xs">
                             {item.type.toUpperCase()}
                           </Badge>
                           <StatusBadge status={item.status} className="text-xs h-5 min-w-[90px]" />
                         </div>
                         <p className="font-medium text-sm truncate" title={item.title}>
                           {item.title}
                         </p>
                         {item.assignee && (
                           <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                             <UserCheck className="h-3 w-3" />
                             {item.assignee.name ?? item.assignee.email}
                           </div>
                         )}
                         {item.type === 'task' && item.percentComplete !== null && (
                           <div className="mt-1 max-w-[100px]">
                             <ProgressBar
                               value={item.percentComplete}
                               status={item.status as any}
                               showLabel={false}
                             />
                           </div>
                         )}
                       </div>
                       <Link
                         href={item.href}
                         onClick={closeDateDetails}
                         className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                       >
                         Read more
                         <BarChart3 className="h-3 w-3" />
                       </Link>
                     </div>
                   </div>
                 ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
