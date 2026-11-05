'use client';

import { cn } from '@/lib/utils';
import * as React from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface UserAvatarProps {
  user: { id: string; name?: string | null; email: string };
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function UserAvatar({ user, size = 'md', className }: UserAvatarProps) {
  const sizeConfig: Record<string, string> = {
    sm: 'h-6 w-6',
    md: 'h-8 w-8',
    lg: 'h-10 w-10',
  };
  const initials = user.name
    ? user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : user.email.charAt(0).toUpperCase();

  return (
    <div className={cn('relative inline-block', className)}>
      <Avatar className={cn(sizeConfig[size])}>
        <AvatarFallback className="text-xs font-medium">{initials}</AvatarFallback>
      </Avatar>
    </div>
  );
}
