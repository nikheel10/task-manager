'use client';

import { cn } from '@/lib/utils';
import * as React from 'react';
import { Badge, BadgeProps } from '@/components/ui/badge';
import { AlertTriangle, Clock } from 'lucide-react';

interface DueDateChipProps {
  dueDate: string | Date;
  className?: string;
}

export function DueDateChip({ dueDate, className }: DueDateChipProps) {
  const due = new Date(dueDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffMs = due.getTime() - today.getTime();
  const diffDays = Math.ceil(diffMs / 86400000);

  let label: string;
  let variant: BadgeProps['variant'] = 'secondary';
  let icon: React.ReactNode = null;

  if (diffDays < 0) {
    label = `${Math.abs(diffDays)} days overdue`;
    variant = 'destructive';
    icon = <AlertTriangle className="h-3 w-3 mr-1" />;
  } else if (diffDays === 0) {
    label = 'Due today';
    variant = 'destructive';
    icon = <Clock className="h-3 w-3 mr-1" />;
  } else if (diffDays <= 3) {
    label = `Due in ${diffDays} days`;
    variant = 'destructive';
    icon = <Clock className="h-3 w-3 mr-1" />;
  } else if (diffDays <= 7) {
    label = `Due in ${diffDays} days`;
    variant = 'warning';
    icon = <Clock className="h-3 w-3 mr-1" />;
  } else if (diffDays <= 30) {
    label = `Due in ${diffDays} days`;
    variant = 'secondary';
    icon = <Clock className="h-3 w-3 mr-1" />;
  } else {
    label = `Due in ${diffDays} days`;
    variant = 'outline';
  }

  return (
    <Badge variant={variant} className={cn('text-xs', className)}>
      {icon}
      {label}
    </Badge>
  );
}
