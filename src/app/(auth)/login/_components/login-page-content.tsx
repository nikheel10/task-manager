'use client';

import { useState, useEffect } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import Link from 'next/link';
import {
  Loader2, Lock, Mail, ShieldCheck, AlertTriangle, ArrowLeft, Building2, Users, CheckCircle,
} from 'lucide-react';

interface Department {
  id: string;
  name: string;
  code: string;
  hasGlobalAccess: boolean;
}

const DEPT_ICONS: Record<string, any> = {
  LIA: Building2,
  LEG: ShieldCheck,
  CMP: CheckCircle,
  PRJ: Building2,
  FIN: Users,
  DOC: Users,
  HR: Users,
};

export function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard';
  const error = searchParams.get('error');

  const [departments, setDepartments] = useState<Department[]>([]);
  const [step, setStep] = useState<'department' | 'login'>('department');
  const [selectedDept, setSelectedDept] = useState<Department | null>(null);
  const [isGlobal, setIsGlobal] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    fetch('/api/public/departments')
      .then((r) => r.json())
      .then((data: { departments: Department[] }) => {
        setDepartments(data.departments ?? []);
      })
      .catch(() => {});
  }, []);

  const selectDepartment = (dept: Department) => {
    setSelectedDept(dept);
    setIsGlobal(false);
    setStep('login');
    setFormError('');
  };

  const selectGlobal = () => {
    setSelectedDept(null);
    setIsGlobal(true);
    setStep('login');
    setFormError('');
  };

  const goBack = () => {
    setStep('department');
    setSelectedDept(null);
    setIsGlobal(false);
    setFormError('');
    setEmail('');
    setPassword('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setFormError('');

    const res = await signIn('credentials', {
      email,
      password,
      departmentId: selectedDept?.id ?? undefined,
      redirect: false,
      callbackUrl: callbackUrl,
    });

    setLoading(false);

    if (res?.error) {
      setFormError('Invalid email, password, or you are not a member of this department');
    } else {
      router.push(callbackUrl);
    }
  };

  const DeptIcon = isGlobal ? ShieldCheck : (selectedDept ? (DEPT_ICONS[selectedDept.code] || Building2) : Building2);

  const demoHint = selectedDept
    ? [
        { email: 'manager', password: 'Manager@123', note: 'Manager@123' },
        { email: 'member', password: 'Member@123', note: 'Member@123' },
      ]
    : [{ email: 'admin@demo.com', password: 'Admin@123', note: 'Admin@123 (Global / Super Admin)' }];

  return (
    <div className="min-h-screen w-full flex lg:flex-row overflow-hidden">
      {/* Brand panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary flex-col items-center justify-center p-12 text-primary-foreground">
        <div className="h-12 w-12 rounded-lg bg-white/10 flex items-center justify-center mb-6">
          <ShieldCheck className="h-6 w-6" />
        </div>
        <h1 className="text-4xl font-bold tracking-tight mb-4">TaskAMC</h1>
        <p className="text-lg text-primary-foreground/90 max-w-md text-center mb-8">
          Professional task, project, and compliance alert management for operations teams.
        </p>
        <div className="space-y-4 text-sm">
          <div className="flex items-center gap-3">
            <Lock className="h-4 w-4" />
            <span>Department-based access control</span>
          </div>
          <div className="flex items-center gap-3">
            <Mail className="h-4 w-4" />
            <span>Real-time notifications</span>
          </div>
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-4 w-4" />
            <span>Compliance deadline tracking</span>
          </div>
        </div>
      </div>

      {/* Login form panel */}
      <div className="flex-1 flex items-center justify-center bg-background p-4 lg:p-0">
        <Card className="w-full max-w-md shadow-lg min-h-[520px]">
          {step === 'department' ? (
            <>
              <CardHeader className="text-center">
                <CardTitle className="text-2xl font-bold">Select your department</CardTitle>
                <CardDescription>Choose the department you belong to before signing in.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {(error || formError) && (
                  <Alert variant="destructive">
                    <AlertDescription>{formError || error}</AlertDescription>
                  </Alert>
                )}
                {departments.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      key="global"
                      onClick={() => selectGlobal()}
                      className={cn(
                        'flex flex-col items-center justify-center gap-2 p-4 rounded-xl border transition-all hover:bg-primary/50 hover:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
                        isGlobal
                          ? 'bg-primary border-primary text-primary-foreground shadow-md'
                          : 'bg-background text-foreground border-input hover:bg-muted'
                      )}
                    >
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-muted/50">
                        <ShieldCheck className="h-5 w-5" />
                      </div>
                      <span className="font-medium text-sm">Global Access</span>
                      <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">SUPER</span>
                      <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded">No department</span>
                    </button>
                    {departments.map((dept) => (
                      <button
                        key={dept.id}
                        onClick={() => selectDepartment(dept)}
                        className={cn(
                          'flex flex-col items-center justify-center gap-2 p-4 rounded-xl border transition-all hover:bg-primary/50 hover:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
                          selectedDept?.id === dept.id
                            ? 'bg-primary border-primary text-primary-foreground shadow-md'
                            : 'bg-background text-foreground border-input hover:bg-muted'
                        )}
                      >
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-muted/50">
                          <DeptIcon className="h-5 w-5" />
                        </div>
                        <span className="font-medium text-sm">{dept.name}</span>
                        <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">{dept.code}</span>
                        {dept.hasGlobalAccess && (
                          <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded">Global access</span>
                        )}
                      </button>
                    ))}
                  </div>
                ) : null}
              </CardContent>
              <CardFooter className="flex items-center justify-between text-sm text-muted-foreground border-t pt-4">
                <p className="text-sm">
                  Don&rsquo;t see your department? Contact your administrator.
                </p>
              </CardFooter>
            </>
          ) : (
            <>
              <CardHeader className="flex items-center justify-between">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={goBack}
                  className="flex items-center gap-1 text-muted-foreground hover:text-foreground"
                >
                  <ArrowLeft className="h-4 w-4" /> {selectedDept?.name}
                </Button>
              </CardHeader>
              <CardContent className="space-y-5">
                {(error || formError) && (
                  <Alert variant="destructive">
                    <AlertDescription>{formError || error}</AlertDescription>
                  </Alert>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email address</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="manager@demo.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        disabled={loading}
                        className="pl-10"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password">Password</Label>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowPassword(!showPassword)}
                        className="p-1 text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? 'Hide' : 'Show'}
                      </Button>
                    </div>
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      disabled={loading}
                    />
                  </div>

                  <Button type="submit" className="w-full bg-primary text-primary-foreground" disabled={loading}>
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Signing in...
                      </>
                    ) : (
                      'Sign in'
                    )}
                  </Button>
                </form>
              </CardContent>
              <CardFooter className="flex flex-col space-y-4 text-center text-sm text-muted-foreground border-t pt-6">
                <p>Sign in as a member of <strong>{selectedDept?.name}</strong> only.</p>
                <p className="text-xs">Demo credentials (must match selected department):</p>
                <div className="space-y-1">
                  {demoHint.map((acc, i) => (
                    <div key={i} className="flex justify-center">
                      <code className="text-xs bg-muted px-2 py-1 rounded">
                        {acc.email} / {acc.password}
                      </code>
                      <span className="ml-2 text-xs text-muted-foreground">{acc.note}</span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground/70">
                  Super Admin / MD users: use the &ldquo;Global Access&rdquo; card.
                </p>
                <p className="text-sm">
                  New user? <Link href="/signup" className="text-primary hover:text-primary/90 font-medium">Register</Link>
                </p>
              </CardFooter>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
