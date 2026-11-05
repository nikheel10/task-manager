'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { NotificationBell } from '@/components/notification-bell';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  LayoutDashboard,
  ListTodo,
  AlertTriangle,
  Building,
  Calendar as CalendarIcon,
  LogOut,
  User,
  Settings,
  Sun,
  Moon,
  TrendingUp,
  ShieldAlert,
  FileText,
  ChevronDown,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { useState, useEffect, useCallback } from 'react';
import { GlobalSearch } from '@/components/global-search';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['SUPER_ADMIN', 'MD', 'MANAGER', 'TEAM_MEMBER', 'VIEWER'] },
  { name: 'Tasks', href: '/tasks', icon: ListTodo, roles: ['SUPER_ADMIN', 'MD', 'MANAGER', 'TEAM_MEMBER'] },
  { name: 'Progress', href: '/progress', icon: FileText, roles: ['VIEWER'] },
  { name: 'Alerts', href: '/alerts', icon: AlertTriangle, roles: ['SUPER_ADMIN', 'MD', 'MANAGER', 'TEAM_MEMBER'] },
  { name: 'Entities', href: '/entities', icon: Building, roles: ['SUPER_ADMIN', 'MD', 'MANAGER'] },
  { name: 'Calendar', href: '/alerts/calendar', icon: CalendarIcon, roles: ['SUPER_ADMIN', 'MD', 'MANAGER'] },
  { name: 'Reports', href: '/reports', icon: FileText, roles: ['SUPER_ADMIN', 'MD', 'MANAGER', 'VIEWER'] },
  { name: 'Pending Requests', href: '/registrations', icon: User, roles: ['SUPER_ADMIN', 'MD', 'MANAGER'] },
];

const adminNavigation = [
  { name: 'Users', href: '/admin/users', icon: ShieldAlert, roles: ['SUPER_ADMIN'] },
  { name: 'Departments', href: '/admin/departments', icon: Building, roles: ['SUPER_ADMIN'] },
  { name: 'Config', href: '/admin/config', icon: Settings, roles: ['SUPER_ADMIN'] },
  { name: 'Audit Log', href: '/admin/audit', icon: ShieldAlert, roles: ['SUPER_ADMIN'] },
  { name: 'Automation', href: '/admin/automation', icon: TrendingUp, roles: ['SUPER_ADMIN'] },
];

export function Navigation() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [overdueCount, setOverdueCount] = useState(0);
  const [searchOpen, setSearchOpen] = useState(false);
  const [departments, setDepartments] = useState<{ id: string; name: string; code: string }[]>([]);
  const [selectedDeptId, setSelectedDeptId] = useState<string>('');
  const [deptDropdownOpen, setDeptDropdownOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (session?.user) {
      fetch('/api/alerts/stats')
        .then((res) => res.ok ? res.json() : { overdue: 0 })
        .then((data) => setOverdueCount(data.overdue || 0))
        .catch(() => setOverdueCount(0));
    }
  }, [session?.user]);

  // Fetch departments for global viewer dropdown
  useEffect(() => {
    if (session?.user && isGlobalViewer(session.user as any)) {
      fetch('/api/departments')
        .then((res) => res.ok ? res.json() : { departments: [] })
        .then((data) => {
          setDepartments(data.departments || []);
          // Set default to user's department
          if ((session.user as any).departmentId) {
            setSelectedDeptId((session.user as any).departmentId);
          }
        })
        .catch(() => {});
    }
  }, [session?.user]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.ctrlKey && e.key === 'k') {
      e.preventDefault();
      setSearchOpen(!searchOpen);
    }
  }, [searchOpen]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  if (!mounted) {
    return <header className="h-16 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60" />;
  }

  const user = session?.user as { 
    id: string; 
    name: string; 
    email: string; 
    role: string; 
    departmentId: string | null;
    departmentHasGlobalAccess: boolean;
  } | undefined;

  const isGlobal = user && isGlobalViewer(user);

  const filteredNav = navigation.filter((item) => item.roles.includes(user?.role || ''));
  const showAdmin = user?.role === 'SUPER_ADMIN';

  return (
    <header className="h-16 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="container flex h-full items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="flex items-center gap-2 font-bold text-xl">
            TaskAMC
          </Link>
          
          {/* Department dropdown for global viewers */}
          {isGlobal && (
            <div className="relative" onMouseLeave={() => setDeptDropdownOpen(false)}>
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-auto px-3"
                onClick={() => setDeptDropdownOpen(!deptDropdownOpen)}
              >
                <Building className="h-4 w-4 mr-1" />
                {selectedDeptId 
                  ? departments.find(d => d.id === selectedDeptId)?.name || 'All Departments'
                  : 'All Departments'}
                <ChevronDown className="h-4 w-4 ml-1" />
              </Button>
              {deptDropdownOpen && (
                <div className="absolute right-0 mt-1 w-56 rounded-md bg-popover py-1 shadow-lg border border-border z-50">
                  <button
                    className={`w-full px-3 py-2 text-left text-sm ${!selectedDeptId ? 'bg-accent' : ''}`}
                    onClick={() => { setSelectedDeptId(''); setDeptDropdownOpen(false); }}
                  >
                    All Departments
                  </button>
                  {departments.map((dept) => (
                    <button
                      key={dept.id}
                      className={`w-full px-3 py-2 text-left text-sm ${selectedDeptId === dept.id ? 'bg-accent' : ''}`}
                      onClick={() => { setSelectedDeptId(dept.id); setDeptDropdownOpen(false); }}
                    >
                      {dept.name} ({dept.code})
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <nav className="hidden md:flex items-center gap-1">
            {filteredNav.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors',
                  pathname === item.href
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.name}
                {item.name === 'Alerts' && overdueCount > 0 && (
                  <Badge variant="destructive" className="ml-1 h-2 px-1 text-xs">
                    {overdueCount}
                  </Badge>
                )}
              </Link>
            ))}
            {(user?.role === 'SUPER_ADMIN' || user?.role === 'MANAGER' || user?.role === 'MD' || user?.role === 'VIEWER') && (
              <Link
                href="/reports"
                className={cn(
                  'flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors',
                  pathname === '/reports'
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )}
              >
                <FileText className="h-4 w-4" />
                Reports
              </Link>
            )}
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <NotificationBell user={user} />

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            aria-label="Toggle theme"
          >
            <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                <Avatar className="h-10 w-10">
                  <AvatarFallback>{user?.name?.charAt(0).toUpperCase() ?? 'U'}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{user?.name}</p>
                  <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
                  <p className="text-xs leading-none text-muted-foreground capitalize">{(user as any)?.role?.toLowerCase()}</p>
                  {user?.departmentId && (
                    <p className="text-xs leading-none text-muted-foreground">Dept: {(user as any).departmentId}</p>
                  )}
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/settings" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Profile
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/settings" className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => signOut({ callbackUrl: '/login' })}
                className="text-destructive focus:text-destructive"
              >
                <LogOut className="h-4 w-4" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      {searchOpen && <GlobalSearch isOpen={searchOpen} onClose={() => setSearchOpen(false)} />}
    </header>
  );
}

function isGlobalViewer(user: { role: string; departmentHasGlobalAccess?: boolean }): boolean {
  return user.role === 'SUPER_ADMIN' || user.role === 'MD' || user.departmentHasGlobalAccess === true;
}