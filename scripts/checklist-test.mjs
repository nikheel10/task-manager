import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function login(email, password) {
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
      email,
      password,
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

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function runTests() {
  console.log('\n📋 Checklist Feature Test Suite\n');

  let passed = 0;
  let failed = 0;
  let taskId;
  let itemIds = {};

  async function test(name, fn) {
    try {
      await fn();
      console.log(`  ✅ ${name}`);
      passed++;
    } catch (error) {
      console.log(`  ❌ ${name}`);
      console.error(`      ${error instanceof Error ? error.message : String(error)}`);
      failed++;
    }
  }

  const adminCookie = await login('admin@demo.com', 'Admin@123');
  const managerCookie = await login('manager@demo.com', 'Manager@123');
  const memberCookie = await login('member@demo.com', 'Member@123');
  const viewerCookie = await login('viewer@demo.com', 'Viewer@123');

  console.log('  ℹ️  Logged in as all 4 roles\n');

  console.log('--- Setup: Create test task ---');

  await test('Manager creates a task for TEAM_MEMBER', async () => {
    const member = await prisma.user.findUnique({ where: { email: 'member@demo.com' } });

    const res = await apiRequest('/api/tasks', 'POST', managerCookie, {
      title: 'Checklist Feature Test Task',
      description: 'Testing the new checklist feature end-to-end',
      priority: 'MEDIUM',
      type: 'TASK',
      assigneeId: member.id,
      dueDate: new Date(Date.now() + 86400000 * 7).toISOString(),
      percentComplete: 0,
    });

    taskId = res.data.id;
    assert(res.status === 200 || res.status === 201, `Expected 200/201, got ${res.status}`);
    assert(res.data.taskNumber, 'Should have task number');
    console.log(`      Created task: ${res.data.title} (id: ${taskId})`);
  });

  await test('Manager moves task to IN_PROGRESS', async () => {
    const res = await apiRequest(`/api/tasks/${taskId}`, 'PATCH', managerCookie, {
      status: 'IN_PROGRESS',
    });
    assert(res.status === 200, `Expected 200, got ${res.status}: ${res.data?.error}`);
  });

  console.log('\n--- Admin/Manager: Add Checklist Items ---');

  await test('Admin adds mandatory checklist item', async () => {
    const res = await apiRequest(`/api/tasks/${taskId}/checklist`, 'POST', adminCookie, {
      title: 'Write unit tests',
      isMandatory: true,
    });
    assert(res.status === 200 || res.status === 201, `Expected 200/201, got ${res.status}: ${res.data?.error}`);
    assert(res.data.title === 'Write unit tests', 'Item title mismatch');
    assert(res.data.isMandatory === true, 'Should be mandatory');
    itemIds.writeTests = res.data.id;
  });

  await test('Manager adds mandatory checklist item', async () => {
    const res = await apiRequest(`/api/tasks/${taskId}/checklist`, 'POST', managerCookie, {
      title: 'Code review',
      isMandatory: true,
    });
    assert(res.status === 200 || res.status === 201, `Expected 200/201, got ${res.status}: ${res.data?.error}`);
    itemIds.review = res.data.id;
  });

  await test('Manager adds optional checklist item', async () => {
    const res = await apiRequest(`/api/tasks/${taskId}/checklist`, 'POST', managerCookie, {
      title: 'Update README',
      isMandatory: false,
    });
    assert(res.status === 200 || res.status === 201, `Expected 200/201, got ${res.status}: ${res.data?.error}`);
    itemIds.readme = res.data.id;
  });

  await test('Duplicate title rejected (400)', async () => {
    const res = await apiRequest(`/api/tasks/${taskId}/checklist`, 'POST', adminCookie, {
      title: 'Write unit tests',
      isMandatory: true,
    });
    assert(res.status === 400, `Expected 400, got ${res.status}`);
    assert(res.data.error.includes('already exists'), `Error should mention "already exists": ${res.data.error}`);
  });

  await test('TEAM_MEMBER cannot add checklist items (403)', async () => {
    const res = await apiRequest(`/api/tasks/${taskId}/checklist`, 'POST', memberCookie, {
      title: 'Hijacking',
      isMandatory: true,
    });
    assert(res.status === 403, `Expected 403, got ${res.status}`);
  });

  await test('VIEWER cannot add checklist items (403)', async () => {
    const res = await apiRequest(`/api/tasks/${taskId}/checklist`, 'POST', viewerCookie, {
      title: 'Viewer attempt',
      isMandatory: true,
    });
    assert(res.status === 403, `Expected 403, got ${res.status}`);
  });

  await test('GET checklist returns all items ordered', async () => {
    const res = await apiRequest(`/api/tasks/${taskId}/checklist`, 'GET', adminCookie);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.data.length === 3, `Expected 3 items, got ${res.data.length}`);
    assert(res.data[0].title === 'Write unit tests', `First item should be "Write unit tests", got "${res.data[0].title}"`);
  });

  console.log('\n--- TEAM_MEMBER: Tick Checklist Items ---');

  await test('Cannot complete task with incomplete mandatory items (400)', async () => {
    const res = await apiRequest(`/api/tasks/${taskId}`, 'PATCH', managerCookie, {
      status: 'COMPLETED',
    });
    assert(res.status === 400, `Expected 400, got ${res.status}`);
    assert(res.data.error.includes('mandatory'), `Error should mention mandatory: ${res.data.error}`);
  });

  await test('TEAM_MEMBER ticks mandatory item (allowed)', async () => {
    const res = await apiRequest(`/api/tasks/${taskId}/checklist/${itemIds.writeTests}`, 'PATCH', memberCookie, {
      completed: true,
    });
    assert(res.status === 200, `Expected 200, got ${res.status}: ${res.data?.error}`);
    assert(res.data.completed === true, 'Should be completed');
    assert(res.data.userId !== null, 'Should have a user set');
    assert(res.data.doneAt !== null, 'Should have doneAt set');
  });

  await test('TEAM_MEMBER ticks second mandatory item', async () => {
    const res = await apiRequest(`/api/tasks/${taskId}/checklist/${itemIds.review}`, 'PATCH', memberCookie, {
      completed: true,
    });
    assert(res.status === 200, `Expected 200, got ${res.status}`);
  });

  await test('TEAM_MEMBER cannot edit items (403)', async () => {
    const res = await apiRequest(`/api/tasks/${taskId}/checklist/${itemIds.writeTests}`, 'PATCH', memberCookie, {
      title: 'Changed by member',
    });
    assert(res.status === 403, `Expected 403 for edit, got ${res.status}`);
  });

  await test('TEAM_MEMBER cannot delete items (403)', async () => {
    const res = await apiRequest(`/api/tasks/${taskId}/checklist/${itemIds.readme}`, 'DELETE', memberCookie);
    assert(res.status === 403, `Expected 403, got ${res.status}`);
  });

  await test('VIEWER cannot tick items (403)', async () => {
    const res = await apiRequest(`/api/tasks/${taskId}/checklist/${itemIds.readme}`, 'PATCH', viewerCookie, {
      completed: true,
    });
    assert(res.status === 403, `Expected 403, got ${res.status}`);
  });

  console.log('\n--- Admin/Manager: Edit Checklist Items ---');

  await test('Manager edits optional item title', async () => {
    const res = await apiRequest(`/api/tasks/${taskId}/checklist/${itemIds.readme}`, 'PATCH', managerCookie, {
      title: 'Update project README',
    });
    assert(res.status === 200, `Expected 200, got ${res.status}: ${res.data?.error}`);
    assert(res.data.title === 'Update project README', 'Title should be updated');
  });

  await test('Duplicate title on edit rejected (400)', async () => {
    const res = await apiRequest(`/api/tasks/${taskId}/checklist/${itemIds.readme}`, 'PATCH', managerCookie, {
      title: 'Write unit tests',
    });
    assert(res.status === 400, `Expected 400, got ${res.status}`);
    assert(res.data.error.includes('already exists'), `Should mention duplicate: ${res.data.error}`);
  });

  await test('Manager edits mandatory flag', async () => {
    const res = await apiRequest(`/api/tasks/${taskId}/checklist/${itemIds.readme}`, 'PATCH', managerCookie, {
      isMandatory: true,
    });
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.data.isMandatory === true, 'Should be mandatory now');
  });

  await test('Manager toggles item completion', async () => {
    const res = await apiRequest(`/api/tasks/${taskId}/checklist/${itemIds.readme}`, 'PATCH', managerCookie, {
      completed: true,
    });
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.data.completed === true, 'Should be completed');
    assert(res.data.doneAt !== null, 'Should have doneAt');
  });

  console.log('\n--- Admin/Manager: Delete Checklist Item ---');

  await test('Admin deletes checklist item', async () => {
    const res = await apiRequest(`/api/tasks/${taskId}/checklist/${itemIds.readme}`, 'DELETE', adminCookie);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
  });

  console.log('\n--- Task Completion Guard ---');

  await test('TEAM_MEMBER re-ticks mandatory item', async () => {
    const res = await apiRequest(`/api/tasks/${taskId}/checklist/${itemIds.writeTests}`, 'PATCH', memberCookie, {
      completed: true,
    });
    assert(res.status === 200, `Expected 200, got ${res.status}`);
  });

  await test('Now all mandatory items complete - manager can complete task', async () => {
    const res = await apiRequest(`/api/tasks/${taskId}`, 'PATCH', managerCookie, {
      status: 'COMPLETED',
    });
    assert(res.status === 200, `Expected 200, got ${res.status}: ${res.data?.error}`);
  });

  console.log('\n--- Audit Log Verification ---');

  await test('Audit log has checklist entries', async () => {
    const res = await apiRequest(`/api/admin/audit?entity=TaskChecklist&limit=50`, 'GET', adminCookie);
    assert(res.status === 200, `Expected 200, got ${res.status}: ${res.data?.error}`);
    const entries = res.data.entries || res.data;
    assert(Array.isArray(entries), `Should return array, got: ${JSON.stringify(entries).slice(0, 100)}`);
    const checklistLogs = entries.filter((e) => e.entity === 'TaskChecklist');
    assert(checklistLogs.length >= 5, `Expected at least 5 checklist audit entries, got ${checklistLogs.length}`);
    assert(checklistLogs.length >= 5, `Expected at least 5 checklist audit entries, got ${checklistLogs.length}`);
    const actions = checklistLogs.map((e) => e.action);
    const hasCreate = actions.includes('CREATE');
    const hasUpdate = actions.includes('UPDATE');
    const hasDelete = actions.includes('DELETE');
    assert(hasCreate, 'Should have CREATE entries');
    assert(hasUpdate, 'Should have UPDATE entries');
    assert(hasDelete, 'Should have DELETE entries');
    console.log(`      Found ${checklistLogs.length} checklist audit entries: CREATE=${hasCreate}, UPDATE=${hasUpdate}, DELETE=${hasDelete}`);
  });

  console.log('\n--- Cleanup ---');

  await test('Cleanup: delete test task', async () => {
    const res = await apiRequest(`/api/tasks/${taskId}`, 'DELETE', adminCookie);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
  });

  console.log(`\n----------------------------------------`);
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log('----------------------------------------\n');

  if (failed > 0) process.exit(1);
  await prisma.$disconnect();
}

runTests()
  .catch((e) => {
    console.error('Test runner error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
