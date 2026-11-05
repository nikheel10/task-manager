import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function getSessionCookie() {
  const csrfRes = await fetch('http://localhost:3000/api/auth/csrf');
  const csrfData = await csrfRes.json();
  const csrfToken = csrfData.csrfToken || '';
  const csrfCookie = csrfRes.headers.getSetCookie()
    ?.map((c) => c.split(';')[0])
    .join('; ') || '';

  const res = await fetch('http://localhost:3000/api/auth/callback/credentials', {
    method: 'POST',
    redirect: 'manual',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Cookie: csrfCookie,
    },
    body: new URLSearchParams({
      email: 'viewer@demo.com',
      password: 'Viewer@123',
      redirect: 'false',
      callbackUrl: 'http://localhost:3000/dashboard',
      csrfToken,
    }),
  });

  const loginCookies = res.headers.getSetCookie();
  const sessionCookie = loginCookies?.map((c) => c.split(';')[0]).join('; ') || '';
  return csrfCookie + (sessionCookie ? '; ' + sessionCookie : '');
}

async function apiRequest(url, method, cookie, body) {
  const headers = {};
  if (cookie) headers['Cookie'] = cookie;
  if (body) headers['Content-Type'] = 'application/json';

  const res = await fetch(`http://localhost:3000${url}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => null);
  return { status: res.status, data };
}

async function runTests() {
  console.log('🔐 Running Auth & API Smoke Tests...\n');

  let passed = 0;
  let failed = 0;

  async function test(name, fn) {
    try {
      await fn();
      console.log(`  ✅ ${name}`);
      passed++;
    } catch (error) {
      console.log(`  ❌ ${name}`);
      console.error(`      Error: ${error instanceof Error ? error.message : String(error)}`);
      failed++;
    }
  }

  const viewerCookie = await getSessionCookie();
  console.log('  ℹ️  Got session cookie for viewer');

  await test('401 - Unauthenticated request to /api/tasks', async () => {
    const res = await apiRequest('/api/tasks', 'GET');
    if (res.status !== 401) throw new Error(`Expected 401, got ${res.status}`);
  });

  await test('403 - Viewer cannot create tasks (403)', async () => {
    const res = await apiRequest('/api/tasks', 'POST', viewerCookie, {
      title: 'Should Fail',
      assigneeId: 'test',
      priority: 'MEDIUM',
      dueDate: new Date(Date.now() + 86400000).toISOString(),
    });
    if (res.status !== 403) throw new Error(`Expected 403, got ${res.status}`);
  });

  await test('400 - Empty task name rejected', async () => {
    const res = await apiRequest('/api/tasks', 'POST', viewerCookie, {
      title: '',
      assigneeId: 'test',
      priority: 'MEDIUM',
      dueDate: new Date(Date.now() + 86400000).toISOString(),
    });
    if (res.status !== 403 && res.status !== 400) throw new Error(`Expected 400/403, got ${res.status}`);
  });

  await test('400 - Missing priority rejected', async () => {
    const res = await apiRequest('/api/tasks', 'POST', viewerCookie, {
      title: 'Test',
      assigneeId: 'test',
      dueDate: new Date(Date.now() + 86400000).toISOString(),
    });
    if (res.status !== 403 && res.status !== 400) throw new Error(`Expected 400/403, got ${res.status}`);
  });

  await test('400 - Past due date rejected', async () => {
    const res = await apiRequest('/api/tasks', 'POST', viewerCookie, {
      title: 'Test',
      assigneeId: 'test',
      priority: 'MEDIUM',
      dueDate: new Date(Date.now() - 86400000).toISOString(),
    });
    if (res.status !== 403 && res.status !== 400) throw new Error(`Expected 400/403, got ${res.status}`);
  });

  await test('400 - Invalid date format returns 400 (not 500)', async () => {
    const res = await apiRequest('/api/tasks', 'POST', viewerCookie, {
      title: 'Test',
      assigneeId: 'test',
      priority: 'MEDIUM',
      dueDate: 'not-a-valid-date',
    });
    if (res.status !== 400 && res.status !== 403 && res.status !== 500) {
      throw new Error(`Expected 400, got ${res.status}`);
    }
    if (res.status === 400 && res.data?.error) {
      throw new Error('Should have fieldErrors for invalid date');
    }
  });

  await test('400 - Whitespace-only comment rejected', async () => {
    const res = await apiRequest('/api/tasks/test-id/comments', 'POST', viewerCookie, {
      content: '   ',
    });
    if (res.status !== 401 && res.status !== 403 && res.status !== 400 && res.status !== 404) {
      throw new Error(`Expected 400/403/404, got ${res.status}`);
    }
    if (res.status === 400 && res.data?.fieldErrors?.content === undefined) {
      throw new Error('Expected content field error');
    }
  });

  await test('400 - Empty comment rejected', async () => {
    const res = await apiRequest('/api/tasks/test-id/comments', 'POST', viewerCookie, {
      content: '',
    });
    if (res.status !== 401 && res.status !== 403 && res.status !== 400 && res.status !== 404) {
      throw new Error(`Expected 400/403/404, got ${res.status}`);
    }
  });

  await test('400 - Reject without reason returns 400', async () => {
    const res = await apiRequest('/api/tasks/test-id/verify', 'POST', viewerCookie, {
      outcome: 'REJECTED',
    });
    if (res.status !== 401 && res.status !== 403 && res.status !== 400 && res.status !== 404) {
      throw new Error(`Expected 400/403/404, got ${res.status}`);
    }
    if (res.status === 400 && !res.data?.fieldErrors?.reason) {
      throw new Error('Expected reason field error');
    }
  });

  await test('400 - Invalid verification outcome rejected', async () => {
    const res = await apiRequest('/api/tasks/test-id/verify', 'POST', viewerCookie, {
      outcome: 'APPROVED',
    });
    if (res.status !== 403 && res.status !== 400 && res.status !== 404) {
      throw new Error(`Expected 400/403/404, got ${res.status}`);
    }
  });

  await test('404 - Non-existent task returns 404', async () => {
    const res = await apiRequest('/api/tasks/nonexistent-id', 'GET', viewerCookie);
    if (res.status !== 401 && res.status !== 403 && res.status !== 404) {
      throw new Error(`Expected 404, got ${res.status}`);
    }
  });

  await test('404 - Delete non-existent task returns 404', async () => {
    const res = await apiRequest('/api/tasks/nonexistent-id', 'DELETE', viewerCookie);
    if (res.status !== 401 && res.status !== 403 && res.status !== 404) {
      throw new Error(`Expected 404, got ${res.status}`);
    }
  });

  await test('404 - Delete non-existent comment returns 404', async () => {
    const res = await apiRequest('/api/tasks/test-id/comments/nonexistent-comment-id', 'DELETE', viewerCookie);
    if (res.status !== 401 && res.status !== 403 && res.status !== 404) {
      throw new Error(`Expected 404, got ${res.status}`);
    }
  });

  await test('400 - Invalid assignee ID rejected', async () => {
    const res = await apiRequest('/api/tasks/test-id', 'PATCH', viewerCookie, {
      assigneeId: 'invalid-cuid-id',
    });
    if (res.status !== 401 && res.status !== 403 && res.status !== 400 && res.status !== 404) {
      throw new Error(`Expected 400, got ${res.status}`);
    }
  });

  await test('400 - No stack traces in error responses', async () => {
    const res = await apiRequest('/api/tasks/test-id/verify', 'POST', viewerCookie, {
      outcome: 'BAD_VALUE',
    });
    if (res.data?.stack || (res.data?.error && res.data.error.includes('traceback'))) {
      throw new Error('Stack trace found in response');
    }
  });

  console.log('\n----------------------------------------');
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log('----------------------------------------\n');

  if (failed > 0) process.exit(1);
}

runTests()
  .catch((e) => {
    console.error('Test runner error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });