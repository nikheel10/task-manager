'use client';

import { cn } from '@/lib/utils';
import * as React from 'react';
import { AlertTriangle, FileText, Users, Clock, Bell } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

const iconMap: Record<string, React.ElementType> = {
  empty: FileText,
  noData: AlertTriangle,
  noTasks: Users,
  noAlerts: Bell,
  noComments: Clock,
};

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: keyof typeof iconMap;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ title, description, icon: iconKey, action, className }: EmptyStateProps) {
  const IconComponent = iconKey ? iconMap[iconKey] : FileText;
  return (
    <div className={cn('flex flex-col items-center justify-center py-12 text-center', className)}>
      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
        <IconComponent className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-medium">{title}</h3>
      {description && <p className="text-muted-foreground mt-2 max-w-sm">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
