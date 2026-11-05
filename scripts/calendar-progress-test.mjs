import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function login(email, password) {
  const csrfRes = await fetch('http://localhost:3000/api/auth/csrf');
  const csrfData = await csrfRes.json();
  const csrfToken = csrfData.csrfToken || '';
  const csrfCookie = csrfRes.headers.getSetCookie()?.map((c) => c.split(';')[0]).join('; ') || '';

  const res = await fetch('http://localhost:3000/api/auth/callback/credentials', {
    method: 'POST',
    redirect: 'manual',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Cookie: csrfCookie },
    body: new URLSearchParams({ email, password, redirect: 'false', callbackUrl: 'http://localhost:3000/dashboard', csrfToken }),
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
    method, headers, body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => null);
  return { status: res.status, data };
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const testDate = new Date();
testDate.setDate(testDate.getDate() + 7);
testDate.setHours(12, 0, 0, 0);
const testDateStr = testDate.toISOString().split('T')[0];

async function runTests() {
  console.log('\n📅 Calendar + Progress Feature Tests\n');
  let passed = 0, failed = 0;

  async function test(name, fn) {
    try { await fn(); console.log(`  ✅ ${name}`); passed++; }
    catch (error) { console.log(`  ❌ ${name}`); console.error(`      ${error instanceof Error ? error.message : String(error)}`); failed++; }
  }

  const adminCookie = await login('admin@demo.com', 'Admin@123');
  const managerCookie = await login('manager@demo.com', 'Manager@123');
  const memberCookie = await login('member@demo.com', 'Member@123');

  console.log('  ℹ️  Logged in as admin, manager, member\n');

  // --- Create 7 tasks on the same date ---
  const createdTaskIds = [];

  console.log('--- Creating 7 tasks on the same date ---');

  for (let i = 1; i <= 7; i++) {
    await test(`Create task ${i}/7 with checklist`, async () => {
      const member = await prisma.user.findUnique({ where: { email: 'member@demo.com' } });
      const res = await apiRequest('/api/tasks', 'POST', managerCookie, {
        title: `Calendar Test Task ${i}`,
        description: `Test task ${i} for calendar validation`,
        priority: 'MEDIUM',
        type: 'TASK',
        assigneeId: member.id,
        dueDate: testDate.toISOString(),
        percentComplete: 0,
      });
      assert(res.status === 200 || res.status === 201, `Expected 200/201, got ${res.status}`);
      createdTaskIds.push(res.data.id);

      // Add 4 checklist items to each task (2 mandatory, 2 optional)
      const checklistRes = await apiRequest(`/api/tasks/${res.data.id}/checklist`, 'POST', managerCookie, {
        title: 'Checklist item 1',
        isMandatory: true,
      });
      assert(checklistRes.status === 200 || checklistRes.status === 201, `Checklist create failed: ${checklistRes.status} ${checklistRes.data?.error}`);

      await apiRequest(`/api/tasks/${res.data.id}/checklist`, 'POST', managerCookie, {
        title: 'Checklist item 2', isMandatory: true,
      });
      await apiRequest(`/api/tasks/${res.data.id}/checklist`, 'POST', managerCookie, {
        title: 'Optional item 1', isMandatory: false,
      });
      await apiRequest(`/api/tasks/${res.data.id}/checklist`, 'POST', managerCookie, {
        title: 'Optional item 2', isMandatory: false,
      });
    });
  }

  // Move all tasks to IN_PROGRESS so they show in calendar
  for (const tid of createdTaskIds) {
    await apiRequest(`/api/tasks/${tid}`, 'PATCH', managerCookie, { status: 'IN_PROGRESS' });
  }

  console.log('\n--- Progress Calculation Tests ---');

  await test('Progress is 0% when no items ticked', async () => {
    const res = await apiRequest(`/api/tasks/${createdTaskIds[0]}`, 'GET', adminCookie);
    assert(res.data.percentComplete === 0, `Expected 0%, got ${res.data.percentComplete}%`);
    assert(res.data.checklist.length === 4, `Expected 4 items, got ${res.data.checklist.length}`);
  });

  await test('Tick 1 item -> 25% (1/4)', async () => {
    const itemRes = await apiRequest(`/api/tasks/${createdTaskIds[0]}/checklist`, 'GET', adminCookie);
    const firstItem = itemRes.data[0];

    const res = await apiRequest(`/api/tasks/${createdTaskIds[0]}/checklist/${firstItem.id}`, 'PATCH', memberCookie, {
      completed: true,
    });
    assert(res.status === 200, `Expected 200, got ${res.status}`);

    // Verify percentComplete was updated
    const taskRes = await apiRequest(`/api/tasks/${createdTaskIds[0]}`, 'GET', adminCookie);
    assert(taskRes.data.percentComplete === 25, `Expected 25%, got ${taskRes.data.percentComplete}%`);
  });

  await test('Tick 2 items -> 50% (2/4)', async () => {
    const itemRes = await apiRequest(`/api/tasks/${createdTaskIds[0]}/checklist`, 'GET', memberCookie);
    const secondItem = itemRes.data[1];

    await apiRequest(`/api/tasks/${createdTaskIds[0]}/checklist/${secondItem.id}`, 'PATCH', memberCookie, {
      completed: true,
    });

    const taskRes = await apiRequest(`/api/tasks/${createdTaskIds[0]}`, 'GET', adminCookie);
    assert(taskRes.data.percentComplete === 50, `Expected 50%, got ${taskRes.data.percentComplete}%`);
  });

  await test('Tick all 4 items -> 100%, status=COMPLETED', async () => {
    const itemRes = await apiRequest(`/api/tasks/${createdTaskIds[0]}/checklist`, 'GET', memberCookie);
    for (const item of itemRes.data) {
      if (!item.completed) {
        await apiRequest(`/api/tasks/${createdTaskIds[0]}/checklist/${item.id}`, 'PATCH', memberCookie, {
          completed: true,
        });
      }
    }

    const taskRes = await apiRequest(`/api/tasks/${createdTaskIds[0]}`, 'GET', adminCookie);
    assert(taskRes.data.percentComplete === 100, `Expected 100%, got ${taskRes.data.percentComplete}%`);
    assert(taskRes.data.status === 'COMPLETED', `Expected COMPLETED, got ${taskRes.data.status}`);
  });

  await test('Untick 1 item -> 75%, status=IN_PROGRESS', async () => {
    const itemRes = await apiRequest(`/api/tasks/${createdTaskIds[0]}/checklist`, 'GET', managerCookie);
    const anyItem = itemRes.data[0];

    await apiRequest(`/api/tasks/${createdTaskIds[0]}/checklist/${anyItem.id}`, 'PATCH', memberCookie, {
      completed: false,
    });

    const taskRes = await apiRequest(`/api/tasks/${createdTaskIds[0]}`, 'GET', adminCookie);
    assert(taskRes.data.percentComplete === 75, `Expected 75%, got ${taskRes.data.percentComplete}%`);
    assert(taskRes.data.status === 'IN_PROGRESS', `Expected IN_PROGRESS, got ${taskRes.data.status}`);
  });

  console.log('\n--- Task List API Returns Progress ---');

  await test('Task list API returns percentComplete', async () => {
    const res = await apiRequest('/api/tasks?limit=100', 'GET', adminCookie);
    assert(res.data.tasks, `Expected tasks array, got: ${JSON.stringify(res.data).slice(0, 100)}`);
    const testTasks = res.data.tasks.filter((t) => t.title.startsWith('Calendar Test Task'));
    assert(testTasks.length === 7, `Expected 7 test tasks, got ${testTasks.length}`);
    assert(testTasks[0].percentComplete !== undefined, 'Task should have percentComplete field');
    assert(testTasks[0]._count !== undefined, 'Task should have _count field');
    assert(testTasks[0]._count.checklist === 4, `Expected _count.checklist=4, got ${testTasks[0]._count.checklist}`);
    console.log(`      Sample: "${testTasks[0].title}" progress=${testTasks[0].percentComplete}% checklist=${testTasks[0]._count.checklist}`);
  });

  console.log('\n--- Dashboard Stats API ---');

  await test('Dashboard stats include avgProgress', async () => {
    const res = await apiRequest('/api/dashboard/stats', 'GET', adminCookie);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.data.avgProgress !== undefined, 'Dashboard stats should include avgProgress');
    assert(typeof res.data.avgProgress === 'number', 'avgProgress should be a number');
    console.log(`      avgProgress = ${Math.round(res.data.avgProgress)}%`);
  });

  console.log('\n--- Calendar Data Grouping ---');

  await test('Calendar API returns tasks on the correct date', async () => {
    const res = await apiRequest('/api/tasks?limit=100', 'GET', adminCookie);
    assert(res.data.tasks, `Expected tasks array, got: ${JSON.stringify(res.data).slice(0, 100)}`);
    const testTasks = res.data.tasks.filter((t) => t.title.startsWith('Calendar Test Task'));
    const dueDates = testTasks.map((t) => new Date(t.dueDate).toISOString().split('T')[0]);
    const uniqueDates = new Set(dueDates);
    assert(uniqueDates.size === 1, `Expected all 7 tasks on same date, got ${uniqueDates.size} dates`);
    assert(uniqueDates.has(testDateStr), `Expected date ${testDateStr}, got ${[...uniqueDates].join(', ')}`);
    console.log(`      All 7 tasks on date: ${testDateStr}`);
  });

  console.log('\n--- Edge Cases ---');

  await test('Task with no checklist: 0% progress, no error', async () => {
    const member = await prisma.user.findUnique({ where: { email: 'member@demo.com' } });
    const res = await apiRequest('/api/tasks', 'POST', managerCookie, {
      title: 'No Checklist Task',
      description: 'Task without checklist',
      priority: 'LOW',
      type: 'TASK',
      assigneeId: member.id,
      dueDate: new Date(Date.now() + 86400000 * 7).toISOString(),
      percentComplete: 0,
    });
    const taskId = res.data.id;
    // Add an alert too (for calendar date test)
    const taskRes = await apiRequest(`/api/tasks/${taskId}`, 'GET', adminCookie);
    assert(taskRes.data.checklist.length === 0, 'Should have no checklist items');
    assert(taskRes.data.percentComplete === 0, 'Should have 0% progress');
  });

  await test('TEAM_MEMBER cannot add checklist items (permission)', async () => {
    const res = await apiRequest(`/api/tasks/${createdTaskIds[0]}/checklist`, 'POST', memberCookie, {
      title: 'Should fail', isMandatory: true,
    });
    assert(res.status === 403, `Expected 403, got ${res.status}`);
  });

  // --- Cleanup ---
  console.log('\n--- Cleanup ---');

  for (const tid of createdTaskIds) {
    await apiRequest(`/api/tasks/${tid}`, 'DELETE', adminCookie);
  }

  // Clean up the no-checklist task
  const noChecklistRes = await apiRequest('/api/tasks?limit=100', 'GET', adminCookie);
  const noChecklistTask = noChecklistRes.data.tasks.find((t) => t.title === 'No Checklist Task');
  if (noChecklistTask) {
    await apiRequest(`/api/tasks/${noChecklistTask.id}`, 'DELETE', adminCookie);
  }

  console.log(`\n----------------------------------------`);
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log('----------------------------------------\n');

  if (failed > 0) process.exit(1);
  await prisma.$disconnect();
}

runTests()
  .catch((e) => { console.error('Test runner error:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
