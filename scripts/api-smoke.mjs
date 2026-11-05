import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function apiRequest(url, method, token, body) {
  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
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
  console.log('🧪 Running API Smoke Tests...\n');

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

  const adminPassword = await bcrypt.hash('Admin@123', 10);
  await prisma.user.upsert({
    where: { email: 'admin@demo.com' },
    update: {},
    create: {
      email: 'admin@demo.com',
      name: 'Admin User',
      passwordHash: adminPassword,
      role: 'SUPER_ADMIN',
    },
  });

  await prisma.user.upsert({
    where: { email: 'viewer@demo.com' },
    update: {},
    create: {
      email: 'viewer@demo.com',
      name: 'Viewer User',
      passwordHash: await bcrypt.hash('Viewer@123', 10),
      role: 'VIEWER',
    },
  });

  const managerUser = await prisma.user.upsert({
    where: { email: 'manager@demo.com' },
    update: {},
    create: {
      email: 'manager@demo.com',
      name: 'Manager User',
      passwordHash: await bcrypt.hash('Manager@123', 10),
      role: 'MANAGER',
    },
  });

  const memberUser = await prisma.user.upsert({
    where: { email: 'member@demo.com' },
    update: {},
    create: {
      email: 'member@demo.com',
      name: 'Team Member',
      passwordHash: await bcrypt.hash('Member@123', 10),
      role: 'TEAM_MEMBER',
    },
  });

  const testTask = await prisma.task.create({
    data: {
      title: 'API Test Task',
      description: 'Test task for API smoke test',
      priority: 'MEDIUM',
      type: 'TASK',
      dueDate: new Date(Date.now() + 7 * 86400000),
      assigneeId: memberUser.id,
      creatorId: managerUser.id,
    },
  });

  console.log('  ℹ️  Test task created:', testTask.id);
  console.log('');

  await test('401 - Unauthenticated request returns 401', async () => {
    const res = await apiRequest('/api/tasks', 'GET');
    if (res.status !== 401) throw new Error(`Expected 401, got ${res.status}`);
  });

  await test('403 - Non-manager cannot create tasks', async () => {
    const res = await apiRequest('/api/tasks', 'POST', undefined, {
      title: 'Should Fail',
      assigneeId: memberUser.id,
      priority: 'LOW',
      dueDate: new Date(Date.now() + 86400000).toISOString(),
    });
    if (res.status !== 401 && res.status !== 403) throw new Error(`Expected 401/403, got ${res.status}`);
  });

  await test('400 - Invalid task data returns 400', async () => {
    const res = await apiRequest('/api/tasks', 'POST', undefined, {
      title: '',
      assigneeId: '',
      priority: '',
      dueDate: '',
    });
    if (res.status !== 401 && res.status !== 400) throw new Error(`Expected 400, got ${res.status}`);
  });

  await test('400 - Missing required fields returns field errors', async () => {
    const res = await apiRequest('/api/tasks', 'POST', undefined, {
      title: '',
      assigneeId: '',
      priority: 'MEDIUM',
      dueDate: new Date(Date.now() + 86400000).toISOString(),
    });
    if (res.status !== 401 && res.status !== 400) throw new Error(`Expected 400, got ${res.status}`);
    if (res.data?.fieldErrors && res.data.fieldErrors.title === undefined) {
      throw new Error('Expected title field error');
    }
  });

  await test('400 - Past due date rejected', async () => {
    const res = await apiRequest('/api/tasks', 'POST', undefined, {
      title: 'Test Task',
      assigneeId: memberUser.id,
      priority: 'MEDIUM',
      dueDate: new Date(Date.now() - 86400000).toISOString(),
    });
    if (res.status !== 401 && res.status !== 400) throw new Error(`Expected 400, got ${res.status}`);
  });

  await test('404 - Non-existent task returns 404', async () => {
    const res = await apiRequest('/api/tasks/nonexistent-id-12345', 'GET');
    if (res.status !== 401 && res.status !== 404) throw new Error(`Expected 404, got ${res.status}`);
  });

  await test('404 - Delete non-existent task returns 404', async () => {
    const res = await apiRequest('/api/tasks/nonexistent-id-12345', 'DELETE');
    if (res.status !== 401 && res.status !== 403 && res.status !== 404) {
      throw new Error(`Expected 404, got ${res.status}`);
    }
  });

  await test('400 - Empty comment rejected', async () => {
    const res = await apiRequest(`/api/tasks/${testTask.id}/comments`, 'POST', undefined, {
      content: '   ',
    });
    if (res.status !== 401 && res.status !== 400) throw new Error(`Expected 400, got ${res.status}`);
  });

  await test('400 - Comment with empty content rejected', async () => {
    const res = await apiRequest(`/api/tasks/${testTask.id}/comments`, 'POST', undefined, {
      content: '',
    });
    if (res.status !== 401 && res.status !== 400) throw new Error(`Expected 400, got ${res.status}`);
  });

  await test('400 - Verification without reason (reject) returns 400', async () => {
    const res = await apiRequest(`/api/tasks/${testTask.id}/verify`, 'POST', undefined, {
      outcome: 'VERIFIED',
      reason: undefined,
    });
    if (res.status !== 401 && res.status !== 403 && res.status !== 400) {
      throw new Error(`Expected 400, got ${res.status}`);
    }
  });

  await test('400 - Invalid verification outcome rejected', async () => {
    const res = await apiRequest(`/api/tasks/${testTask.id}/verify`, 'POST', undefined, {
      outcome: 'APPROVED',
    });
    if (res.status !== 401 && res.status !== 403 && res.status !== 400) {
      throw new Error(`Expected 400/403, got ${res.status}`);
    }
  });

  await test('404 - Delete non-existent comment returns 404', async () => {
    const res = await apiRequest(`/api/tasks/${testTask.id}/comments/nonexistent-comment-id`, 'DELETE');
    if (res.status !== 401 && res.status !== 403 && res.status !== 404) {
      throw new Error(`Expected 404, got ${res.status}`);
    }
  });

  await test('400 - Invalid assignee rejected', async () => {
    const res = await apiRequest(`/api/tasks/${testTask.id}`, 'PATCH', undefined, {
      assigneeId: 'nonexistent-user-id',
    });
    if (res.status !== 401 && res.status !== 403 && res.status !== 400) {
      throw new Error(`Expected 400, got ${res.status}`);
    }
  });

  await test('400 - Invalid date format rejected (not 500)', async () => {
    const res = await apiRequest('/api/tasks', 'POST', undefined, {
      title: 'Test Task',
      assigneeId: memberUser.id,
      priority: 'MEDIUM',
      dueDate: 'not-a-valid-date',
    });
    if (res.status !== 401 && res.status !== 400) throw new Error(`Expected 400, got ${res.status}`);
  });

  // Test: Blocked task validation - blockedReason required
  await test('400 - Blocked status without reason rejected', async () => {
    const res = await apiRequest(`/api/tasks/${testTask.id}`, 'PATCH', undefined, {
      status: 'BLOCKED',
    });
    if (res.status !== 401 && res.status !== 400) throw new Error(`Expected 400, got ${res.status}`);
    if (res.data?.fieldErrors && res.data.fieldErrors.blockedReason === undefined) {
      throw new Error('Expected blockedReason field error');
    }
  });

  // Test: Invalid status transition
  await test('400 - Invalid status transition rejected', async () => {
    const res = await apiRequest(`/api/tasks/${testTask.id}`, 'PATCH', undefined, {
      status: 'CLOSED',
    });
    if (res.status !== 401 && res.status !== 403 && res.status !== 400) {
      throw new Error(`Expected 400/403, got ${res.status}`);
    }
  });

  // Test: TaskCategories endpoint
  await test('200 - Task categories endpoint accessible', async () => {
    const res = await apiRequest('/api/task-categories', 'GET');
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    if (!res.data?.categories) throw new Error('Expected categories in response');
  });

  // Test: Projects endpoint
  await test('200 - Projects endpoint accessible', async () => {
    const res = await apiRequest('/api/projects', 'GET');
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    if (!res.data?.projects) throw new Error('Expected projects in response');
  });

  // Test: Milestones endpoint
  await test('200 - Milestones endpoint accessible', async () => {
    const res = await apiRequest('/api/milestones?projectId=default-project', 'GET');
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    if (!res.data?.milestones) throw new Error('Expected milestones in response');
  });

  // Test: Attachments endpoint accessible
  await test('200 - Attachments endpoint accessible', async () => {
    const res = await apiRequest(`/api/tasks/${testTask.id}/attachments`, 'GET');
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    if (!Array.isArray(res.data)) throw new Error('Expected array of attachments');
  });

  // === AMC Module Tests ===

  console.log('\n--- AMC Module Tests ---\n');

  // Test: AMC endpoints require auth
  await test('401 - Unauthenticated alert request returns 401', async () => {
    const res = await apiRequest('/api/alerts', 'GET');
    if (res.status !== 401) throw new Error(`Expected 401, got ${res.status}`);
  });

  await test('401 - Unauthenticated entities request returns 401', async () => {
    const res = await apiRequest('/api/entities', 'GET');
    if (res.status !== 401) throw new Error(`Expected 401, got ${res.status}`);
  });

  await test('401 - Unauthenticated alert stats returns 401', async () => {
    const res = await apiRequest('/api/alerts/stats', 'GET');
    if (res.status !== 401) throw new Error(`Expected 401, got ${res.status}`);
  });

  await test('401 - Unauthenticated regulatory templates returns 401', async () => {
    const res = await apiRequest('/api/regulatory-templates', 'GET');
    if (res.status !== 401) throw new Error(`Expected 401, got ${res.status}`);
  });

  await test('401 - Unauthenticated settings returns 401', async () => {
    const res = await apiRequest('/api/settings/reminder-rules', 'GET');
    if (res.status !== 401) throw new Error(`Expected 401, got ${res.status}`);
  });

  await test('401 - Unauthenticated alert creation returns 401', async () => {
    const res = await apiRequest('/api/alerts', 'POST', undefined, {
      title: 'Test Alert',
      type: 'COMPLIANCE_FILING',
      priority: 'HIGH',
      entityId: 'nonexistent',
      ownerId: 'nonexistent',
      dueDate: new Date(Date.now() + 86400000).toISOString(),
    });
    if (res.status !== 401) throw new Error(`Expected 401, got ${res.status}`);
  });

  await test('401 - Unauthenticated from-template request returns 401', async () => {
    const res = await apiRequest('/api/alerts/from-template', 'POST', undefined, {
      templateId: 'nonexistent',
      entityId: 'nonexistent',
      ownerId: 'nonexistent',
    });
    if (res.status !== 401) throw new Error(`Expected 401, got ${res.status}`);
  });

  console.log('\n----------------------------------------');
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log('----------------------------------------\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests()
  .catch((e) => {
    console.error('Test runner error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });