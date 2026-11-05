'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Mail, Building2, User, Hash, Lock, ArrowLeft } from 'lucide-react';

const signupSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(60, 'Name too long'),
  employeeId: z.string().trim().min(3, 'Employee ID must be at least 3 characters').max(20, 'Employee ID too long'),
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
  departmentId: z.string().min(1, 'Please select a department'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

type SignupFormData = z.infer<typeof signupSchema>;

interface Department {
  id: string;
  name: string;
}

export default function SignupPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard';

  const [departments, setDepartments] = useState<Department[]>([]);
  const [loadingDepts, setLoadingDepts] = useState(true);
  const [step, setStep] = useState<'form' | 'success'>('form');
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState('');

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: { name: '', employeeId: '', email: '', password: '', confirmPassword: '', departmentId: '' },
  });

  const departmentId = watch('departmentId');

  useEffect(() => {
    fetch('/api/departments/public')
      .then((r) => r.json())
      .then((data: { departments: Department[] }) => {
        setDepartments(data.departments);
        setLoadingDepts(false);
      })
      .catch(() => setLoadingDepts(false));
  }, []);

  const onSubmit = async (data: SignupFormData) => {
    setLoading(true);
    setFormError('');

    try {
      const res = await fetch('/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.name,
          employeeId: data.employeeId.toUpperCase(),
          email: data.email.toLowerCase(),
          password: data.password,
          confirmPassword: data.confirmPassword,
          departmentId: data.departmentId,
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        // Show field-specific errors if available
        if (result.fieldErrors) {
          const firstField = Object.keys(result.fieldErrors)[0];
          const firstError = result.fieldErrors[firstField]?.[0];
          setFormError(firstError || result.error || 'Signup failed');
        } else {
          setFormError(result.error || 'Signup failed');
        }
        setLoading(false);
        return;
      }

      setStep('success');
    } catch (err: any) {
      setFormError(err.message || 'Signup failed. Please try again.');
      setLoading(false);
    }
  };

  if (step === 'success') {
    return (
      <div className="min-h-screen flex lg:flex-row overflow-hidden">
        <div className="hidden lg:flex lg:w-1/2 bg-primary flex-col items-center justify-center p-12 text-primary-foreground">
          <div className="h-12 w-12 rounded-lg bg-white/10 flex items-center justify-center mb-6">
            <Hash className="h-6 w-6" />
          </div>
          <h1 className="text-4xl font-bold tracking-tight mb-4">TaskAMC</h1>
          <p className="text-lg text-primary-foreground/90 max-w-md text-center mb-8">
            Registration request submitted successfully.
          </p>
        </div>
        <div className="flex-1 flex items-center justify-center bg-background p-4 lg:p-0">
          <Card className="w-full max-w-md shadow-lg text-center">
            <CardHeader>
              <CardTitle className="text-2xl font-bold">Request Submitted</CardTitle>
              <CardDescription>
                {formError ? (
                  <span className="text-destructive">{formError}</span>
                ) : (
                  <>
                    Your registration request has been sent to the department manager for approval. You will be able to log in once approved.
                  <br />
                    <br />
                    You will receive a notification when your request is approved or rejected.
                  </>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button onClick={() => router.push('/login')} className="w-full">
                Back to Login
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex lg:flex-row overflow-hidden">
      <div className="hidden lg:flex lg:w-1/2 bg-primary flex-col items-center justify-center p-12 text-primary-foreground">
        <div className="h-12 w-12 rounded-lg bg-white/10 flex items-center justify-center mb-6">
          <User className="h-6 w-6" />
        </div>
        <h1 className="text-4xl font-bold tracking-tight mb-4">TaskAMC</h1>
        <p className="text-lg text-primary-foreground/90 max-w-md text-center mb-8">
          Create your account. Your department manager must approve your request before you can log in.
        </p>
      </div>

      <div className="flex-1 flex items-center justify-center bg-background p-4 lg:p-0">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold">Register</CardTitle>
            <CardDescription>Join your department's TaskAMC workspace</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {formError && (
              <Alert variant="destructive">
                <AlertDescription>{formError}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  placeholder="John Doe"
                  {...register('name')}
                  disabled={loading}
                  className={errors.name ? 'border-destructive' : ''}
                />
                {errors.name && <span className="text-xs text-destructive">{errors.name.message}</span>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="employeeId">Employee ID</Label>
                <Input
                  id="employeeId"
                  placeholder="EMP-1023"
                  {...register('employeeId')}
                  disabled={loading}
                  className={errors.employeeId ? 'border-destructive' : ''}
                />
                {errors.employeeId && <span className="text-xs text-destructive">{errors.employeeId.message}</span>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="john@company.com"
                    {...register('email')}
                    disabled={loading}
                    className={`pl-10 ${errors.email ? 'border-destructive' : ''}`}
                  />
                </div>
                {errors.email && <span className="text-xs text-destructive">{errors.email.message}</span>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  {...register('password')}
                  disabled={loading}
                  className={errors.password ? 'border-destructive' : ''}
                />
                {errors.password && <span className="text-xs text-destructive">{errors.password.message}</span>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  {...register('confirmPassword')}
                  disabled={loading}
                  className={errors.confirmPassword ? 'border-destructive' : ''}
                />
                {errors.confirmPassword && <span className="text-xs text-destructive">{errors.confirmPassword.message}</span>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="departmentId">Department</Label>
                <select
                  id="departmentId"
                  {...register('departmentId')}
                  disabled={loading || loadingDepts}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">Select department</option>
                  {loadingDepts ? (
                    <option disabled>Loading departments...</option>
                  ) : (
                    departments.map((dept) => (
                      <option key={dept.id} value={dept.id}>
                        {dept.name}
                      </option>
                    ))
                  )}
                </select>
                {errors.departmentId && <span className="text-xs text-destructive">{errors.departmentId.message}</span>}
              </div>

              <p className="text-xs text-muted-foreground">
                Your employee ID will be stored in uppercase. Password must contain uppercase, lowercase, number, and special character.
              </p>

              <Button type="submit" className="w-full bg-primary text-primary-foreground" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Register'
                )}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4 text-center text-sm text-muted-foreground border-t pt-6">
            <p>Already have an account?</p>
            <Button asChild variant="link" onClick={() => router.push('/login')}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Back to Login
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
