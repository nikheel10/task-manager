'use client';

import { Providers } from '@/components/providers';
import { SidebarLayout } from '@/components/layout/sidebar-layout';
import { ReactNode } from 'react';

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <Providers>
      <SidebarLayout>{children}</SidebarLayout>
    </Providers>
  );
}

