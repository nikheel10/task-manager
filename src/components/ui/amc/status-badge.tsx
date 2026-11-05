'use client';

import { cn } from '@/lib/utils';
import * as React from 'react';
import { Badge } from '@/components/ui/badge';

type TaskStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'CLOSED' | 'BLOCKED' | 'OVERDUE' | 'CANCELLED' | 'PENDING' | string;
type VerificationOutcome = 'VERIFIED' | 'REJECTED' | null;

interface StatusStyle {
  label: string;
  className: string;
}

const statusConfig: Record<string, StatusStyle> = {
  NOT_STARTED: {
    label: 'Not Started',
    className: 'bg-slate-100 text-slate-600 border border-slate-300 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-600',
  },
  IN_PROGRESS: {
    label: 'In Progress',
    className: 'bg-blue-100 text-blue-700 border border-blue-300 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-700',
  },
  BLOCKED: {
    label: 'Blocked',
    className: 'bg-red-100 text-red-700 border border-red-300 dark:bg-red-900/30 dark:text-red-400 dark:border-red-700',
  },
  COMPLETED: {
    label: 'Completed',
    className: 'bg-teal-100 text-teal-700 border border-teal-300 dark:bg-teal-900/30 dark:text-teal-400 dark:border-teal-700',
  },
  CLOSED: {
    label: 'Closed',
    className: 'bg-green-100 text-green-700 border border-green-300 dark:bg-green-900/30 dark:text-green-400 dark:border-green-700',
  },
  OVERDUE: {
    label: 'Overdue',
    className: 'bg-red-100 text-red-700 border border-red-300 dark:bg-red-900/30 dark:text-red-400 dark:border-red-700',
  },
  CANCELLED: {
    label: 'Cancelled',
    className: 'bg-slate-100 text-slate-600 border border-slate-300 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-600',
  },
};

const verificationConfig: Record<NonNullable<VerificationOutcome>, StatusStyle> = {
  VERIFIED: {
    label: 'Verified',
    className: 'bg-green-100 text-green-700 border border-green-300 dark:bg-green-900/30 dark:text-green-400 dark:border-green-700',
  },
  REJECTED: {
    label: 'Rejected',
    className: 'bg-red-100 text-red-700 border border-red-300 dark:bg-red-900/30 dark:text-red-400 dark:border-red-700',
  },
};

const statusBadgeClasses = 'h-6 px-3 min-w-[110px] justify-center text-xs font-semibold uppercase whitespace-nowrap';
const verificationBadgeClasses = 'h-6 px-3 min-w-[90px] justify-center text-xs font-semibold uppercase whitespace-nowrap';
const pendingBadgeClasses = 'h-6 px-3 min-w-[90px] justify-center text-xs font-semibold uppercase whitespace-nowrap bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700';

interface StatusBadgeProps {
  status: TaskStatus;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.NOT_STARTED;
  return (
    <Badge
      variant="outline"
      className={cn(statusBadgeClasses, config.className, className)}
    >
      {config.label}
    </Badge>
  );
}

interface VerificationBadgeProps {
  outcome: NonNullable<VerificationOutcome>;
  className?: string;
}

export function VerificationBadge({ outcome, className }: VerificationBadgeProps) {
  const config = verificationConfig[outcome];
  return (
    <Badge
      variant="outline"
      className={cn(verificationBadgeClasses, config.className, className)}
    >
      {config.label}
    </Badge>
  );
}

interface VerificationStatusBadgeProps {
  verifiedAt: Date | string | undefined | null;
  verifications: { outcome: 'VERIFIED' | 'REJECTED' }[] | undefined | null;
  taskStatus: TaskStatus;
  className?: string;
  isPendingVerification?: boolean;
}

export function VerificationStatusBadge({
  verifiedAt,
  verifications,
  taskStatus,
  className,
  isPendingVerification = false,
}: VerificationStatusBadgeProps) {
  if (isPendingVerification || (taskStatus === 'COMPLETED' && !verifiedAt)) {
    return (
      <Badge
        variant="outline"
        className={cn(pendingBadgeClasses, className)}
      >
        Pending Verification
      </Badge>
    );
  }

  if (!verifiedAt) {
    return (
      <span className="text-muted-foreground text-sm min-w-[90px] text-center inline-block">
        —
      </span>
    );
  }

  const outcome = verifications?.[0]?.outcome as NonNullable<VerificationOutcome> || 'REJECTED';
  return <VerificationBadge outcome={outcome} className={className} />;
}
