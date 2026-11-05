'use client';

import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function Error() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <AlertTriangle className="h-8 w-8 text-destructive" />
          </div>
          <CardTitle className="text-2xl font-bold">Sign-in error</CardTitle>
          <p className="text-muted-foreground">
            Unable to sign in. Please check your credentials and try again.
          </p>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link href="/login">Try again</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
