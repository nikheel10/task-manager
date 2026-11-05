'use client';

import * as React from 'react';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  ListTodo,
  AlertTriangle,
  Calendar,
  FileText,
  ShieldAlert,
  Settings,
  TrendingUp,
  LogOut,
  Sun,
  Moon,
  Menu,
  X,
  Search,
  Bell,
  ChevronRight,
  Building,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { GlobalSearch } from '@/components/global-search';
import { NotificationBell } from '@/components/notification-bell';
import { useTheme } from '@/components/theme-provider';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const sidebarItems = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, group: 'work', roles: ['SUPER_ADMIN', 'MD', 'MANAGER', 'TEAM_MEMBER', 'VIEWER'] },
  { name: 'Tasks', href: '/tasks', icon: ListTodo, group: 'work', roles: ['SUPER_ADMIN', 'MD', 'MANAGER', 'TEAM_MEMBER'] },
  { name: 'Alerts', href: '/alerts', icon: AlertTriangle, group: 'work', roles: ['SUPER_ADMIN', 'MD', 'MANAGER', 'TEAM_MEMBER'] },
  { name: 'Calendar', href: '/alerts/calendar', icon: Calendar, group: 'work', roles: ['SUPER_ADMIN', 'MD', 'MANAGER'] },
  { name: 'Reports', href: '/reports', icon: FileText, group: 'insights', roles: ['SUPER_ADMIN', 'MD', 'MANAGER', 'VIEWER'] },
  { name: 'Users', href: '/admin/users', icon: ShieldAlert, group: 'admin', roles: ['SUPER_ADMIN'] },
  { name: 'Departments', href: '/admin/departments', icon: Building, group: 'admin', roles: ['SUPER_ADMIN'] },
  { name: 'Automation', href: '/admin/automation', icon: TrendingUp, group: 'admin', roles: ['SUPER_ADMIN'] },
  { name: 'Audit Log', href: '/admin/audit', icon: FileText, group: 'admin', roles: ['SUPER_ADMIN'] },
  { name: 'Config', href: '/admin/config', icon: Settings, group: 'admin', roles: ['SUPER_ADMIN'] },
  { name: 'Pending Requests', href: '/registrations', icon: ShieldAlert, group: 'admin', roles: ['SUPER_ADMIN', 'MD', 'MANAGER'] },
];

const groupLabels: Record<string, string> = {
  work: 'Overview',
  insights: 'Analytics',
  admin: 'Administration',
};

interface SidebarLayoutProps {
  children: React.ReactNode;
}

export function SidebarLayout({ children }: SidebarLayoutProps) {
  const [collapsed, setCollapsed] = React.useState(false);
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const [searchOpen, setSearchOpen] = React.useState(false);
  const pathname = usePathname();
  const { data: session } = useSession();
  const { theme, setTheme } = useTheme();

  const user = session?.user as { id: string; name: string; email: string; role: string; image?: string } | undefined;

  const isSidebarItemActive = (href: string) => {
    return pathname === href || (href !== '/' && pathname.startsWith(href));
  };

  const toggleSidebar = () => setCollapsed((prev) => !prev);
  const toggleMobileSidebar = () => setSidebarOpen((prev) => !prev);
  const toggleSearch = () => setSearchOpen((prev) => !prev);
  const closeMobileSidebar = () => setSidebarOpen(false);

  const getUserInitials = (name?: string, email?: string) => {
    if (name) {
      return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
    }
    if (email) {
      return email.slice(0, 2).toUpperCase();
    }
    return 'U';
  };

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'k') {
        e.preventDefault();
        toggleSearch();
      }
      if (e.key === 'Escape') {
        setSearchOpen(false);
        setSidebarOpen(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const SidebarNav = () => (
    <>
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between h-16 px-4 border-b border-sidebar-border">
          {!collapsed ? (
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-md">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="flex flex-col">
                <span className="font-semibold text-sm tracking-tight text-sidebar-foreground">TaskAMC</span>
                <span className="text-xs text-sidebar-foreground/60">Alert &amp; Compliance</span>
              </div>
            </div>
          ) : (
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-md mx-auto">
              <AlertTriangle className="h-5 w-5" />
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="h-7 w-7 text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent"
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <X className="h-4 w-4" />}
          </Button>
        </div>

        <ScrollArea className="flex-1 px-3 py-4">
          <nav className="space-y-6">
            {['work', 'insights', 'admin'].map((group) => {
              const items = sidebarItems.filter((i) => i.group === group && i.roles.includes(user?.role || ''));
              if (items.length === 0) return null;

              return (
                <div key={group}>
                  <h3 className="px-3 text-xs font-semibold tracking-wider uppercase text-sidebar-group-text mb-2">
                    {groupLabels[group]}
                  </h3>
                  <div className="space-y-1">
                    {items.map((item) => {
                      const active = isSidebarItemActive(item.href);
                      const Icon = item.icon;
                      return (
                        <Button
                          key={item.name}
                          asChild
                          variant="ghost"
                          className={cn(
                            'group relative flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
                            active
                              ? 'bg-sidebar-active-bg text-sidebar-active-text'
                              : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground'
                          )}
                        >
                          <Link href={item.href} onClick={closeMobileSidebar} className="flex items-center gap-3 w-full">
                            <Icon
                              className={cn(
                                'h-5 w-5 shrink-0 transition-colors',
                                active ? 'text-sidebar-active-text' : 'text-sidebar-foreground/50 group-hover:text-sidebar-foreground'
                              )}
                            />
                            {!collapsed && <span className="truncate">{item.name}</span>}
                          </Link>
                          {collapsed && (
                            <span className="absolute left-full top-1/2 -translate-y-1/2 ml-2 whitespace-nowrap rounded-md bg-popover px-2.5 py-1.5 text-xs font-medium text-popover-foreground shadow-lg opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                              {item.name}
                            </span>
                          )}
                          {active && collapsed && (
                            <span className="absolute left-full top-1/2 -translate-y-1/2 ml-2 whitespace-nowrap rounded-md bg-sidebar-active-bg px-2.5 py-1.5 text-xs font-medium text-sidebar-active-text shadow-lg">
                              {item.name}
                            </span>
                          )}
                        </Button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </nav>
        </ScrollArea>

        <div className="border-t border-sidebar-border p-3">
          <Button
            variant="ghost"
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="w-full flex items-center gap-3 text-sm font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground rounded-lg px-3 py-2.5"
          >
            <LogOut className="h-5 w-5 shrink-0" />
            {!collapsed && <span>Sign out</span>}
          </Button>
        </div>
      </div>
    </>
  );

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background">
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm lg:hidden"
          onClick={toggleMobileSidebar}
        />
      )}

      <aside
        className={cn(
          'fixed z-50 top-0 bottom-0 flex flex-col transition-transform duration-200 ease-in-out lg:translate-x-0',
          'bg-sidebar text-sidebar-foreground border-r border-sidebar-border',
          collapsed ? 'w-16' : 'w-64',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        <SidebarNav />
      </aside>

      <div className={cn('flex-1 flex flex-col relative min-w-0', collapsed ? 'lg:ml-16' : 'lg:ml-64')}>
        <header className="sticky top-0 z-30 h-16 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 flex items-center justify-between px-4 lg:px-6">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleMobileSidebar}
              className="lg:hidden"
              aria-label="Toggle sidebar"
            >
              <Menu className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-semibold text-foreground hidden lg:block">
              {sidebarItems.find((i) => isSidebarItemActive(i.href))?.name || 'Dashboard'}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <div className="w-full max-w-md">
              <GlobalSearch isOpen={searchOpen} onClose={toggleSearch} />
            </div>

            <div className="hidden lg:flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                aria-label="Toggle theme"
                className="h-9 w-9"
              >
                {theme === 'dark' ? (
                  <Sun className="h-5 w-5" />
                ) : (
                  <Moon className="h-5 w-5" />
                )}
              </Button>
            </div>

            <NotificationBell user={user} />

            <Avatar className="h-9 w-9">
              <AvatarImage src={user?.image || ''} alt={user?.name || 'User'} />
              <AvatarFallback className="bg-primary/10 text-primary font-medium">
                {getUserInitials(user?.name, user?.email)}
              </AvatarFallback>
            </Avatar>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
