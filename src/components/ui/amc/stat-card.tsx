'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';
import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: { value: number; label: string; positive?: boolean };
  icon?: React.ReactNode;
  className?: string;
  href?: string;
}

export function StatCard({ title, value, subtitle, trend, icon, className, href }: StatCardProps) {
  const content = (
    <Card className={cn(className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon && <div className="text-muted-foreground">{icon}</div>}
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-bold">{value}</span>
          {subtitle && <span className="text-muted-foreground text-sm">{subtitle}</span>}
        </div>
        {trend && (
          <div className="mt-2 flex items-center gap-1">
            <span
              className={cn(
                'text-xs font-medium',
                trend.positive ? 'text-green-500' : 'text-red-500'
              )}
            >
              {trend.positive ? '+' : '-'}{trend.value}%
            </span>
            <span className="text-xs text-muted-foreground">{trend.label}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );

  if (href) {
    return (
      <Link href={href} className="block hover:shadow-md transition-shadow cursor-pointer">
        {content}
      </Link>
    );
  }

  return content;
}
