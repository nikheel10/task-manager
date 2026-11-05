'use client';

import { format, parseISO } from 'date-fns';

interface SafeDateProps {
  date: Date | string | null | undefined;
  formatStr?: string;
  fallback?: string;
}

export function SafeDate({ date, formatStr = 'PPP', fallback = '—' }: SafeDateProps) {
  if (!date) return <span className="text-muted-foreground">{fallback}</span>;

  try {
    const d = typeof date === 'string' ? parseISO(date) : date;
    if (isNaN(d.getTime())) return <span className="text-muted-foreground">{fallback}</span>;
    return <time dateTime={d.toISOString()}>{format(d, formatStr)}</time>;
  } catch {
    return <span className="text-muted-foreground">{fallback}</span>;
  }
}

interface SafeDateTimeProps {
  date: Date | string | null | undefined;
  fallback?: string;
}

export function SafeDateTime({ date, fallback = '—' }: SafeDateTimeProps) {
  return <SafeDate date={date} formatStr="PPp" fallback={fallback} />;
}

interface SafeRelativeTimeProps {
  date: Date | string | null | undefined;
  fallback?: string;
}

export function SafeRelativeTime({ date, fallback = '—' }: SafeRelativeTimeProps) {
  if (!date) return <span className="text-muted-foreground">{fallback}</span>;

  try {
    const d = typeof date === 'string' ? parseISO(date) : date;
    if (isNaN(d.getTime())) return <span className="text-muted-foreground">{fallback}</span>;

    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return <span>Just now</span>;
    if (diffMins < 60) return <span>{diffMins}m ago</span>;
    if (diffHours < 24) return <span>{diffHours}h ago</span>;
    if (diffDays < 7) return <span>{diffDays}d ago</span>;
    return <SafeDate date={d} formatStr="PP" fallback={fallback} />;
  } catch {
    return <span className="text-muted-foreground">{fallback}</span>;
  }
}