'use client';

import { Suspense } from 'react';
import { LoginPageContent } from './_components/login-page-content';

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <LoginPageContent />
    </Suspense>
  );
}