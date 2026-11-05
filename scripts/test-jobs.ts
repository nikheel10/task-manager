import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

let passed = 0;
let failed = 0;

async function test(name: string, fn: () => Promise<void>) {
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

async function assert(condition: boolean, message?: string) {
  if (!condition) throw new Error(message || 'Assertion failed');
}

async function assertEqual(actual: unknown, expected: unknown, message?: string) {
  if (actual !== expected) {
    throw new Error(`${message || 'Expected'} ${expected} but got ${actual}`);
  }
}

async function main() {
  console.log('🧪 Running AMC Job Unit Tests...\n');

  // Clean up any previous test data
  await prisma.jobRun.deleteMany({ where: { jobName: 'daily-job' } });
  await prisma.alertReminderLog.deleteMany();
  await prisma.alertEscalationRule.deleteMany({ where: { alertId: null } });
  await prisma.alertReminderRule.deleteMany({ where: { alertId: null } });
  await prisma.notification.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.alert.deleteMany();
  await prisma.entity.deleteMany();
  await prisma.user.deleteMany({
    where: { email: { contains: '@test.com' } },
  });

  // Create test users
  const admin = await prisma.user.create({
    data: {
      email: 'admin@test.com',
      name: 'Admin Test',
      passwordHash: 'hash',
      role: 'SUPER_ADMIN',
    },
  });
  const owner = await prisma.user.create({
    data: {
      email: 'owner@test.com',
      name: 'Owner Test',
      passwordHash: 'hash',
      role: 'TEAM_MEMBER',
    },
  });

  // Create test entity
  const entity = await prisma.entity.create({
    data: {
      name: 'Test Entity',
      type: 'COMPANY',
      jurisdiction: 'Test',
      isActive: true,
    },
  });

  // Create test department
  const dept = await prisma.department.create({
    data: { name: 'Test Dept', code: 'TST', active: true },
  });

  // === TEST 1: Overdue Marking ===
  await test('Daily job marks alerts OVERDUE when due date passed', async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // Create an alert that's already due (overdue)
    await prisma.alert.create({
      data: {
        title: 'Overdue Alert',
        type: 'REGULATORY',
        status: 'OPEN',
        priority: 'HIGH',
        entityId: entity.id,
        ownerId: owner.id,
        departmentId: dept.id,
        createdById: admin.id,
        triggerDate: yesterday,
        dueDate: yesterday,
        recurrence: 'ONE_TIME',
      },
    });

    // Create an alert due in the future (should not be overdue)
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    await prisma.alert.create({
      data: {
        title: 'Future Alert',
        type: 'REGULATORY',
        status: 'OPEN',
        priority: 'HIGH',
        entityId: entity.id,
        ownerId: owner.id,
        departmentId: dept.id,
        createdById: admin.id,
        triggerDate: today,
        dueDate: tomorrow,
        recurrence: 'ONE_TIME',
      },
    });

    // Create an already COMPLETED alert that's due (should not be marked overdue)
    await prisma.alert.create({
      data: {
        title: 'Completed Alert',
        type: 'REGULATORY',
        status: 'COMPLETED',
        priority: 'HIGH',
        entityId: entity.id,
        ownerId: owner.id,
        departmentId: dept.id,
        createdById: admin.id,
        triggerDate: yesterday,
        dueDate: yesterday,
        recurrence: 'ONE_TIME',
      },
    });

    // Import and run the job logic inline for testing
    const { runDailyJob } = await import('../src/lib/jobs/run-reminders');
    const result = await runDailyJob();

    assert(result.success, 'Job should succeed');

    // Verify overdue alert is now OVERDUE
    const overdueAlert = await prisma.alert.findFirst({ where: { title: 'Overdue Alert' } });
    assert(overdueAlert !== null, 'Overdue alert should exist');
    assertEqual(overdueAlert!.status, 'OVERDUE', 'Overdue alert should be marked OVERDUE');

    // Verify future alert is still OPEN
    const futureAlert = await prisma.alert.findFirst({ where: { title: 'Future Alert' } });
    assert(futureAlert !== null, 'Future alert should exist');
    assertEqual(futureAlert!.status, 'OPEN', 'Future alert should remain OPEN');

    // Verify completed alert is still COMPLETED
    const completedAlert = await prisma.alert.findFirst({ where: { title: 'Completed Alert' } });
    assert(completedAlert !== null, 'Completed alert should exist');
    assertEqual(completedAlert!.status, 'COMPLETED', 'Completed alert should remain COMPLETED');

    assert(result.stats.alertsMarkedOverdue === 1, 'Should mark exactly 1 alert as overdue');
  });

   // === TEST 2: Reminder De-duplication ===
  await prisma.jobRun.deleteMany({ where: { jobName: 'daily-job' } });
  await test('Reminder system does not send duplicate reminders same day', async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Create alert due in 30 days with 30-day reminder
    const dueDate = new Date(today);
    dueDate.setDate(dueDate.getDate() + 30);

    await prisma.alert.create({
      data: {
        title: 'Reminder Test Alert',
        type: 'REGULATORY',
        status: 'OPEN',
        priority: 'MEDIUM',
        entityId: entity.id,
        ownerId: owner.id,
        departmentId: dept.id,
        createdById: admin.id,
        triggerDate: today,
        dueDate: dueDate,
        recurrence: 'ONE_TIME',
      },
    });

    const { runDailyJob } = await import('../src/lib/jobs/run-reminders');

    await prisma.alertReminderRule.create({
      data: {
        daysBefore: 30,
        isActive: true,
      },
    });

    const result1 = await runDailyJob();
    const logCount1 = await prisma.alertReminderLog.count({ where: { daysBefore: 30 } });
    assert(logCount1 === 1, 'First run should create 1 reminder log');

    // Second run - should NOT create duplicate
    const result2 = await runDailyJob();
    const logCount2 = await prisma.alertReminderLog.count({ where: { daysBefore: 30 } });
    assert(logCount2 === 1, 'Second run should not create duplicate reminder log');

    assert(result1.stats.remindersSent === 1, 'First run should send 1 reminder');
    assert(result2.stats.remindersSent === 0, 'Second run should send 0 reminders (deduplicated)');
  });

   // === TEST 3: Escalation ===
  await prisma.jobRun.deleteMany({ where: { jobName: 'daily-job' } });
  await test('Escalation notifies configured role for overdue alerts', async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const overdueDate = new Date(today);
    overdueDate.setDate(overdueDate.getDate() - 5); // 5 days overdue

    await prisma.alert.create({
      data: {
        title: 'Escalation Test Alert',
        type: 'STATUTORY',
        status: 'OPEN',
        priority: 'HIGH',
        entityId: entity.id,
        ownerId: owner.id,
        departmentId: dept.id,
        createdById: admin.id,
        triggerDate: overdueDate,
        dueDate: overdueDate,
        recurrence: 'ONE_TIME',
      },
    });

    // Set escalation rule: escalate to MANAGER after 3 days overdue
    await prisma.alertEscalationRule.create({
      data: {
        afterDaysOverdue: 3,
        escalateToRole: 'MANAGER',
        isActive: true,
      },
    });

    // Create another manager user to receive escalation
    await prisma.user.create({
      data: {
        email: 'manager@test.com',
        name: 'Manager Test',
        passwordHash: 'hash',
        role: 'MANAGER',
      },
    });

    const { runDailyJob } = await import('../src/lib/jobs/run-reminders');
    const result = await runDailyJob();

    assert(result.stats.escalationsSent >= 1, 'Should send at least 1 escalation');

    // Verify escalation notification exists
    const escalationNotif = await prisma.notification.findFirst({
      where: { type: 'ALERT_ESCALATION' },
    });
    assert(escalationNotif !== null, 'Should create escalation notification');

    // Verify audit log for escalation
    const escalationAudit = await prisma.auditLog.findFirst({
      where: { action: 'ESCALATE', entity: 'Alert' },
    });
    assert(escalationAudit !== null, 'Should create audit log for escalation');
  });

   // === TEST 4: Recurrence Generation ===
  await prisma.jobRun.deleteMany({ where: { jobName: 'daily-job' } });
  await test('Daily job generates next occurrence for completed recurring alerts', async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Create a completed monthly alert
    await prisma.alert.create({
      data: {
        title: 'Monthly Recurring Alert',
        type: 'COMPLIANCE_FILING',
        status: 'COMPLETED',
        priority: 'HIGH',
        entityId: entity.id,
        ownerId: owner.id,
        departmentId: dept.id,
        createdById: admin.id,
        triggerDate: today,
        dueDate: today,
        recurrence: 'MONTHLY',
        completedAt: today,
      },
    });

    const { runDailyJob } = await import('../src/lib/jobs/run-reminders');
    const result = await runDailyJob();

    assert(result.stats.recurrencesGenerated === 1, 'Should generate exactly 1 recurrence');

    // Verify child alert exists
    const parentAlert = await prisma.alert.findFirst({ where: { title: 'Monthly Recurring Alert' } });
    assert(parentAlert !== null, 'Parent alert should exist');
    const childAlerts = await prisma.alert.findMany({ where: { parentAlertId: parentAlert!.id } });
    assert(childAlerts.length === 1, 'Should create 1 child alert');

    // Child should be OPEN with next month due date
    const child = childAlerts[0];
    assertEqual(child.status, 'OPEN', 'Child alert should be OPEN');
    assert(child.dueDate > parentAlert!.dueDate, 'Child due date should be after parent due date');
  });

   // === TEST 5: Idempotency ===
  await prisma.jobRun.deleteMany({ where: { jobName: 'daily-job' } });
  await test('Job is idempotent - running twice same day sends nothing twice', async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { runDailyJob } = await import('../src/lib/jobs/run-reminders');

    // Run again - should be idempotent for overdue marking
    const result = await runDailyJob();
    assert(result.success, 'Job should succeed on repeat run');

    // All counts should be 0 since nothing new to do
    assert(result.stats.alertsMarkedOverdue === 0, 'Should not mark new overdue alerts on repeat');
    assert(result.stats.remindersSent === 0, 'Should not send duplicate reminders');
  });

  // Cleanup
  await prisma.notification.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.alert.deleteMany();
  await prisma.entity.deleteMany();
  await prisma.user.deleteMany({ where: { email: { contains: '@test.com' } } });

  console.log(`\n📊 Results: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error('Test runner error:', error);
  process.exit(1);
});
