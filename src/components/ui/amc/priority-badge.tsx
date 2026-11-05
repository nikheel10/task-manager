'use client';

import { cn } from '@/lib/utils';
import * as React from 'react';
import { Badge, BadgeProps } from '@/components/ui/badge';

type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

const priorityConfig: Record<Priority, { label: string; variant: BadgeProps['variant'] }> = {
  LOW: { label: 'Low', variant: 'secondary' },
  MEDIUM: { label: 'Medium', variant: 'secondary' },
  HIGH: { label: 'High', variant: 'warning' },
  URGENT: { label: 'Urgent', variant: 'destructive' },
};

interface PriorityBadgeProps {
  priority: Priority;
  className?: string;
}

export function PriorityBadge({ priority, className }: PriorityBadgeProps) {
  const config = priorityConfig[priority] as { label: string; variant: BadgeProps['variant'] };
  return <Badge variant={config.variant} className={cn(className)}>{config.label}</Badge>;
}
