const loginAttempts = new Map<string, { count: number; firstAttempt: number }>();
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_ATTEMPTS = 5;

export function checkLoginRateLimit(email: string): { allowed: boolean; remainingTime?: number } {
  const now = Date.now();
  const record = loginAttempts.get(email);

  if (!record) {
    loginAttempts.set(email, { count: 1, firstAttempt: now });
    return { allowed: true };
  }

  if (now - record.firstAttempt > WINDOW_MS) {
    loginAttempts.set(email, { count: 1, firstAttempt: now });
    return { allowed: true };
  }

  if (record.count >= MAX_ATTEMPTS) {
    const remainingTime = WINDOW_MS - (now - record.firstAttempt);
    return { allowed: false, remainingTime };
  }

  record.count++;
  return { allowed: true };
}

export function resetLoginRateLimit(email: string): void {
  loginAttempts.delete(email);
}

export function getLoginAttempts(email: string): number {
  const record = loginAttempts.get(email);
  return record?.count ?? 0;
}
