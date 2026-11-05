'use client';

import { cn } from '@/lib/utils';
import * as React from 'react';

interface ProgressBarProps {
  value: number;
  max?: number;
  className?: string;
  showLabel?: boolean;
  status?: 'NOT_STARTED' | 'IN_PROGRESS' | 'BLOCKED' | 'COMPLETED' | 'CLOSED';
}

const statusColorMap: Record<string, string> = {
  BLOCKED: 'bg-red-400',
  IN_PROGRESS: 'bg-blue-400',
  COMPLETED: 'bg-teal-400',
  CLOSED: 'bg-green-400',
  NOT_STARTED: 'bg-slate-300',
};

export function ProgressBar({ value, max = 100, className, showLabel = false, status }: ProgressBarProps) {
  const percentage = Math.round((value / max) * 100);
  const barColor = status ? statusColorMap[status] : 'bg-primary';
  return (
    <div className={cn('w-full', className)}>
      <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
        <div
          className={cn('h-2 rounded-full transition-all duration-300', barColor)}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {showLabel && (
        <div className="flex justify-between text-xs text-muted-foreground mt-1">
          <span>{percentage}%</span>
        </div>
      )}
    </div>
  );
}
