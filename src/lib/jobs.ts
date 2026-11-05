import { prisma } from '@/lib/prisma';
import { createNotification } from '@/lib/notifications';
import { createAuditLog } from '@/lib/audit';
import { formatAlertNumber } from '@/lib/alert-rules';
import { formatTaskNumber } from '@/lib/task-rules';

export interface JobResult {
  jobName: string;
  runDate: Date;
  success: boolean;
  stats: {
    alertsMarkedOverdue: number;
    remindersSent: number;
    escalationsSent: number;
    tasksMarkedOverdue: number;
    taskRemindersSent: number;
    taskEscalationsSent: number;
    recurrencesGenerated: number;
  };
  error?: string;
}

export async function runTaskOverdueCheck(): Promise<{ tasksMarkedOverdue: number; taskRemindersSent: number; taskEscalationsSent: number }> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let tasksMarkedOverdue = 0;
  let taskRemindersSent = 0;
  let taskEscalationsSent = 0;

  const overdueTasks = await prisma.task.findMany({
    where: {
      deletedAt: null,
      status: { notIn: ['CLOSED', 'COMPLETED'] },
      dueDate: { lt: today },
    },
    include: {
      assignee: { select: { id: true, name: true, email: true, departmentId: true } },
      creator: { select: { id: true, name: true } },
      department: { select: { id: true, name: true } },
    },
  });

  for (const task of overdueTasks) {
    tasksMarkedOverdue++;

    // Notify assignee
    await createNotification({
      userId: task.assigneeId,
      type: 'TASK_OVERDUE',
      title: 'Task Overdue',
      message: `Task "${task.title}" (${formatTaskNumber(task.taskNumber)}) is overdue.`,
      metadata: { taskId: task.id, taskNumber: task.taskNumber },
      taskId: task.id,
    });
    taskRemindersSent++;

    // Notify department manager
    if (task.departmentId) {
      const deptManagers = await prisma.user.findMany({
        where: { departmentId: task.departmentId, role: 'MANAGER', isActive: true },
        select: { id: true },
      });
      for (const mgr of deptManagers) {
        await createNotification({
          userId: mgr.id,
          type: 'TASK_OVERDUE',
          title: 'Task Overdue in Your Department',
          message: `Task "${task.title}" (${formatTaskNumber(task.taskNumber)}) assigned to ${task.assignee.name} is overdue.`,
          metadata: { taskId: task.id, taskNumber: task.taskNumber },
          taskId: task.id,
        });
      }
    }

    // Notify creator
    if (task.creatorId !== task.assigneeId) {
      await createNotification({
        userId: task.creatorId,
        type: 'TASK_OVERDUE',
        title: 'Task Overdue',
        message: `Task "${task.title}" (${formatTaskNumber(task.taskNumber)}) you created is overdue.`,
        metadata: { taskId: task.id, taskNumber: task.taskNumber },
        taskId: task.id,
      });
    }

    // Escalate if overdue > 7 days
    const daysOverdue = Math.ceil((today.getTime() - new Date(task.dueDate).getTime()) / 86400000);
    if (daysOverdue >= 7) {
      const managers = await prisma.user.findMany({
        where: { role: { in: ['SUPER_ADMIN', 'MD', 'MANAGER'] }, isActive: true },
        select: { id: true },
      });
      for (const mgr of managers) {
        await createNotification({
          userId: mgr.id,
          type: 'TASK_ESCALATED',
          title: 'Task Overdue Escalation',
          message: `Task "${task.title}" is overdue by ${daysOverdue} days.`,
          metadata: { taskId: task.id, daysOverdue },
          taskId: task.id,
        });
      }
      taskEscalationsSent++;
    }
  }

  return { tasksMarkedOverdue, taskRemindersSent, taskEscalationsSent };
}

export async function runAlertReminders(): Promise<{ remindersSent: number }> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let remindersSent = 0;

  const alerts = await prisma.alert.findMany({
    where: {
      deletedAt: null,
      status: { in: ['OPEN', 'IN_PROGRESS', 'SUBMITTED'] },
      dueDate: { gte: today },
    },
    include: {
      owner: { select: { id: true, name: true } },
      reminderRules: { where: { isActive: true } },
    },
  });

  for (const alert of alerts) {
    const allRules = [...(alert.reminderRules || [])];

    // Add global reminder rules
    const globalRules = await prisma.alertReminderRule.findMany({
      where: { alertId: null, isActive: true },
    });
    allRules.push(...globalRules);

    for (const rule of allRules) {
      const reminderDate = new Date(alert.dueDate);
      reminderDate.setDate(reminderDate.getDate() - rule.daysBefore);
      reminderDate.setHours(0, 0, 0, 0);

      if (reminderDate.getTime() === today.getTime()) {
        const existingLog = await prisma.alertReminderLog.findFirst({
          where: {
            alertId: alert.id,
            daysBefore: rule.daysBefore,
            sentAt: {
              gte: new Date(today.getFullYear(), today.getMonth(), today.getDate()),
              lt: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1),
            },
          },
        });

        if (!existingLog) {
          await prisma.alertReminderLog.create({
            data: { alertId: alert.id, daysBefore: rule.daysBefore },
          });

          await createNotification({
            userId: alert.ownerId,
            type: 'ALERT_REMINDER',
            title: 'Alert Reminder',
            message: `Alert "${alert.title}" (${formatAlertNumber(alert.alertNumber)}) is due in ${rule.daysBefore} days.`,
            metadata: { alertId: alert.id, alertNumber: alert.alertNumber, daysBefore: rule.daysBefore },
            alertId: alert.id,
          });
          remindersSent++;
        }
      }
    }
  }

  return { remindersSent };
}

export async function runAlertEscalation(): Promise<{ escalationsSent: number }> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let escalationsSent = 0;

  const alerts = await prisma.alert.findMany({
    where: {
      deletedAt: null,
      status: { notIn: ['COMPLETED', 'CANCELLED'] },
      dueDate: { lt: today },
    },
    include: {
      owner: { select: { id: true, name: true } },
      department: { select: { id: true, name: true } },
      escalationRules: { where: { isActive: true } },
    },
  });

  for (const alert of alerts) {
    const daysOverdue = Math.ceil((today.getTime() - new Date(alert.dueDate).getTime()) / 86400000);
    const allRules = [...(alert.escalationRules || [])];

    // Add global escalation rules
    const globalRules = await prisma.alertEscalationRule.findMany({
      where: { alertId: null, isActive: true },
    });
    allRules.push(...globalRules);

    for (const rule of allRules) {
      if (daysOverdue >= rule.afterDaysOverdue) {
        const lastEscalation = await prisma.notification.findFirst({
          where: {
            alertId: alert.id,
            type: 'ALERT_ESCALATION',
            createdAt: {
              gte: new Date(today.getTime() - rule.afterDaysOverdue * 86400000),
            },
          },
        });

        if (!lastEscalation) {
          let escalateUserId: string | null = null;

          if (rule.escalateToUserId) {
            escalateUserId = rule.escalateToUserId;
          } else if (rule.escalateToRole) {
            const user = await prisma.user.findFirst({
              where: { role: rule.escalateToRole as any, isActive: true },
              select: { id: true },
            });
            escalateUserId = user?.id ?? null;
          } else if (alert.departmentId) {
            const deptManager = await prisma.user.findFirst({
              where: { departmentId: alert.departmentId, role: 'MANAGER', isActive: true },
              select: { id: true },
            });
            escalateUserId = deptManager?.id ?? null;
          }

          if (escalateUserId) {
            await createNotification({
              userId: escalateUserId,
              type: 'ALERT_ESCALATION',
              title: 'Alert Escalated',
              message: `Alert "${alert.title}" (${formatAlertNumber(alert.alertNumber)}) has been escalated (${daysOverdue} days overdue).`,
              metadata: {
                alertId: alert.id,
                alertNumber: alert.alertNumber,
                daysOverdue,
                ruleAfterDays: rule.afterDaysOverdue,
              },
              alertId: alert.id,
            });

            await createAuditLog({
              action: 'ESCALATE',
              entity: 'Alert',
              entityId: alert.id,
              userId: escalateUserId,
              alertId: alert.id,
              newData: { escalateToUserId: escalateUserId, daysOverdue },
            });

            await prisma.alert.update({
              where: { id: alert.id },
              data: { escalatedAt: new Date() },
            });

            escalationsSent++;
          }
        }
        break; // Only apply first matching escalation rule
      }
    }
  }

  return { escalationsSent };
}

export async function generateNextRecurrence(): Promise<{ recurrencesGenerated: number }> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let recurrencesGenerated = 0;

  const completedAlerts = await prisma.alert.findMany({
    where: {
      deletedAt: null,
      status: 'COMPLETED',
      recurrence: { not: 'ONE_TIME' },
    },
    include: {
      childAlerts: {
        where: {
          status: { in: ['OPEN', 'IN_PROGRESS', 'SUBMITTED', 'OVERDUE'] },
        },
      },
    },
  });

  for (const alert of completedAlerts) {
    if (alert.recurrenceEndDate && new Date(alert.recurrenceEndDate) <= today) {
      continue;
    }

    if (alert.childAlerts.length > 0) {
      continue;
    }

    const nextDueDate = calculateNextDueDate(alert.dueDate, alert.recurrence, alert.recurrenceIntervalDays ?? undefined);

    if (!nextDueDate || nextDueDate <= today) {
      continue;
    }

    const nextAlert = await prisma.alert.create({
      data: {
        title: alert.title,
        reference: alert.reference,
        description: alert.description,
        type: alert.type,
        status: 'OPEN',
        priority: alert.priority,
        entityId: alert.entityId,
        ownerId: alert.ownerId,
        departmentId: alert.departmentId,
        createdById: alert.createdById,
        regulatoryClause: alert.regulatoryClause,
        triggerDate: nextDueDate,
        dueDate: nextDueDate,
        recurrence: alert.recurrence,
        recurrenceIntervalDays: alert.recurrenceIntervalDays,
        recurrenceEndDate: alert.recurrenceEndDate,
        parentAlertId: alert.id,
      },
    });

    // Copy reminder rules
    const reminderRules = await prisma.alertReminderRule.findMany({
      where: { alertId: alert.id },
    });
    if (reminderRules.length > 0) {
      await prisma.alertReminderRule.createMany({
        data: reminderRules.map((rule) => ({
          alertId: nextAlert.id,
          daysBefore: rule.daysBefore,
          isActive: rule.isActive,
        })),
      });
    }

    // Copy escalation rules
    const escalationRules = await prisma.alertEscalationRule.findMany({
      where: { alertId: alert.id },
    });
    if (escalationRules.length > 0) {
      await prisma.alertEscalationRule.createMany({
        data: escalationRules.map((rule) => ({
          alertId: nextAlert.id,
          afterDaysOverdue: rule.afterDaysOverdue,
          escalateToRole: rule.escalateToRole,
          escalateToUserId: rule.escalateToUserId,
          isActive: rule.isActive,
        })),
      });
    }

    await createNotification({
      userId: alert.ownerId,
      type: 'ALERT_RENEWED',
      title: 'New Alert Occurrence Generated',
      message: `A new occurrence of recurring alert "${alert.title}" (${formatAlertNumber(alert.alertNumber)}) has been created.`,
      metadata: { alertId: nextAlert.id, parentAlertId: alert.id },
      alertId: nextAlert.id,
    });

    recurrencesGenerated++;
  }

  return { recurrencesGenerated };
}

function calculateNextDueDate(dueDate: Date, recurrence: string, intervalDays?: number): Date | null {
  const next = new Date(dueDate);
  switch (recurrence) {
    case 'MONTHLY':
      next.setMonth(next.getMonth() + 1);
      break;
    case 'QUARTERLY':
      next.setMonth(next.getMonth() + 3);
      break;
    case 'ANNUAL':
      next.setFullYear(next.getFullYear() + 1);
      break;
    case 'CUSTOM':
      if (intervalDays) {
        next.setDate(next.getDate() + intervalDays);
      } else {
        return null;
      }
      break;
    default:
      return null;
  }
  return next;
}

export async function runAllJobs(): Promise<JobResult> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const runDateKey = new Date(today);

  try {
    const existingRun = await prisma.jobRun.findUnique({
      where: {
        jobName_runDate: {
          jobName: 'all-jobs',
          runDate: runDateKey,
        },
      },
    });

    if (existingRun && existingRun.status === 'SUCCESS') {
      return {
        jobName: 'all-jobs',
        runDate: today,
        success: true,
        stats: {
          alertsMarkedOverdue: 0,
          remindersSent: 0,
          escalationsSent: 0,
          tasksMarkedOverdue: 0,
          taskRemindersSent: 0,
          taskEscalationsSent: 0,
          recurrencesGenerated: 0,
        },
      };
    }

    const stats = {
      alertsMarkedOverdue: 0,
      remindersSent: 0,
      escalationsSent: 0,
      tasksMarkedOverdue: 0,
      taskRemindersSent: 0,
      taskEscalationsSent: 0,
      recurrencesGenerated: 0,
    };

    await prisma.$transaction(async (tx) => {
      // Mark overdue alerts
      const overdueAlerts = await tx.alert.findMany({
        where: {
          deletedAt: null,
          status: { notIn: ['COMPLETED', 'CANCELLED', 'OVERDUE'] },
          dueDate: { lt: today },
        },
      });
      for (const alert of overdueAlerts) {
        await tx.alert.update({ where: { id: alert.id }, data: { status: 'OVERDUE' } });
        stats.alertsMarkedOverdue++;
      }

      // Run task overdue check
      const taskResult = await runTaskOverdueCheck();
      stats.tasksMarkedOverdue = taskResult.tasksMarkedOverdue;
      stats.taskRemindersSent = taskResult.taskRemindersSent;
      stats.taskEscalationsSent = taskResult.taskEscalationsSent;

      // Run alert reminders
      const reminderResult = await runAlertReminders();
      stats.remindersSent = reminderResult.remindersSent;

      // Run alert escalation
      const escalationResult = await runAlertEscalation();
      stats.escalationsSent = escalationResult.escalationsSent;

      // Generate recurrences
      const recurrenceResult = await generateNextRecurrence();
      stats.recurrencesGenerated = recurrenceResult.recurrencesGenerated;

      await tx.jobRun.create({
        data: {
          jobName: 'all-jobs',
          runDate: runDateKey,
          status: 'SUCCESS',
          result: stats as any,
        },
      });
    });

    return {
      jobName: 'all-jobs',
      runDate: today,
      success: true,
      stats,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    await prisma.jobRun.create({
      data: {
        jobName: 'all-jobs',
        runDate: runDateKey,
        status: 'FAILED',
        error: errorMsg,
      },
    }).catch(() => {});
    return {
      jobName: 'all-jobs',
      runDate: today,
      success: false,
      stats: {
        alertsMarkedOverdue: 0,
        remindersSent: 0,
        escalationsSent: 0,
        tasksMarkedOverdue: 0,
        taskRemindersSent: 0,
        taskEscalationsSent: 0,
        recurrencesGenerated: 0,
      },
      error: errorMsg,
    };
  }
}
