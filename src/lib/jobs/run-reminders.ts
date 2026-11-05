import { prisma } from '@/lib/prisma';
import { createNotification } from '@/lib/notifications';
import { createAuditLog } from '@/lib/audit';
import { formatAlertNumber, calculateNextDueDate } from '@/lib/alert-rules';
import { DEFAULT_REMINDER_DAYS } from '@/lib/alert-rules';

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

const TASK_ESCALATION_DAYS = 7;
const TASK_OVERDUE_STATUS_EXCLUDED = ['CLOSED'];

export async function runDailyJob(): Promise<JobResult> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const runDateKey = new Date(today);

  try {
    const existingRun = await prisma.jobRun.findUnique({
      where: {
        jobName_runDate: {
          jobName: 'daily-job',
          runDate: runDateKey,
        },
      },
    });

    if (existingRun && existingRun.status === 'SUCCESS') {
      return {
        jobName: 'daily-job',
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
        error: undefined,
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
      // (a) Mark alerts OVERDUE when due date passed and not completed/cancelled
      const overdueAlerts = await tx.alert.findMany({
        where: {
          deletedAt: null,
          status: { notIn: ['COMPLETED', 'CANCELLED', 'OVERDUE'] },
          dueDate: { lt: today },
        },
      });

      for (const alert of overdueAlerts) {
        await tx.alert.update({
          where: { id: alert.id },
          data: { status: 'OVERDUE' },
        });

        await createAuditLog({
          action: 'MARK_OVERDUE',
          entity: 'Alert',
          entityId: alert.id,
          userId: alert.createdById,
          alertId: alert.id,
          oldData: { status: alert.status },
          newData: { status: 'OVERDUE' },
        });

        stats.alertsMarkedOverdue++;
      }

      // (b) Send advance reminders per active reminder rules (both alert-specific and global)
      const globalReminderRules = await tx.alertReminderRule.findMany({
        where: { alertId: null, isActive: true },
      });

      const dueSoonAlerts = await tx.alert.findMany({
        where: {
          deletedAt: null,
          status: { in: ['OPEN', 'IN_PROGRESS', 'SUBMITTED'] },
          dueDate: { gte: today },
        },
        include: { reminderRules: true },
      });

      for (const alert of dueSoonAlerts) {
        const alertRules = alert.reminderRules?.filter((r) => r.isActive) ?? [];
        const allRules = [...alertRules, ...globalReminderRules];
        for (const rule of allRules) {
          const reminderDate = new Date(alert.dueDate);
          reminderDate.setDate(reminderDate.getDate() - rule.daysBefore);
          reminderDate.setHours(0, 0, 0, 0);

          if (reminderDate.getTime() === today.getTime()) {
            const existingLog = await tx.alertReminderLog.findFirst({
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
              await tx.alertReminderLog.create({
                data: {
                  alertId: alert.id,
                  daysBefore: rule.daysBefore,
                },
              });

              await createNotification({
                userId: alert.ownerId,
                type: 'ALERT_REMINDER',
                title: 'Alert Reminder',
                message: `Alert "${alert.title}" (${formatAlertNumber(alert.alertNumber)}) is due in ${rule.daysBefore} days.`,
                metadata: { alertId: alert.id, alertNumber: alert.alertNumber, daysBefore: rule.daysBefore },
                alertId: alert.id,
              });

              stats.remindersSent++;
            }
          }
        }
      }

      // (c) Escalate overdue/unresolved alerts per escalation rules (both alert-specific and global)
      const globalEscalationRules = await tx.alertEscalationRule.findMany({
        where: { alertId: null, isActive: true },
      });

      const overdueUnresolvedAlerts = await tx.alert.findMany({
        where: {
          deletedAt: null,
          status: { notIn: ['COMPLETED', 'CANCELLED'] },
          dueDate: { lt: today },
        },
        include: { escalationRules: true },
      });

      for (const alert of overdueUnresolvedAlerts) {
        const daysOverdue = Math.ceil((today.getTime() - new Date(alert.dueDate).getTime()) / 86400000);

        const alertRules = alert.escalationRules?.filter((r) => r.isActive) ?? [];
        const allEscalationRules = [...alertRules, ...globalEscalationRules];
        for (const rule of allEscalationRules) {
          if (daysOverdue >= rule.afterDaysOverdue) {
            const lastEscalation = await tx.notification.findFirst({
              where: {
                alertId: alert.id,
                type: 'ALERT_ESCALATION',
                createdAt: {
                  gte: new Date(today.getTime() - rule.afterDaysOverdue * 86400000),
                },
              },
            });

            if (!lastEscalation) {
              let escalateUserId: string | null = rule.escalateToUserId;
              if (!escalateUserId && rule.escalateToRole) {
                const user = await tx.user.findFirst({
                  where: { role: rule.escalateToRole as any, isActive: true },
                  select: { id: true },
                });
                escalateUserId = user?.id ?? null;
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
                  newData: {
                    escalateToUserId: escalateUserId,
                    escalateToRole: rule.escalateToRole,
                    daysOverdue,
                  },
                });

                stats.escalationsSent++;
              }
            }
          }
        }
      }

      // (d) Notify overdue tasks and escalate tasks overdue > X days to manager
      const tasksDueDate = new Date();
      tasksDueDate.setDate(tasksDueDate.getDate() - 1);

      const overdueTasks = await tx.task.findMany({
        where: {
          deletedAt: null,
          status: { notIn: ['CLOSED' as any, 'COMPLETED'] },
          dueDate: { lt: new Date() },
        },
        include: { assignee: { select: { id: true, name: true, email: true } } },
      });

      for (const task of overdueTasks) {
        stats.tasksMarkedOverdue++;

        await createNotification({
          userId: task.assigneeId,
          type: 'TASK_OVERDUE',
          title: 'Task Overdue',
          message: `Task "${task.title}" is overdue.`,
          metadata: { taskId: task.id },
          taskId: task.id,
        });

        const daysOverdue = Math.ceil((new Date().getTime() - new Date(task.dueDate).getTime()) / 86400000);

        if (daysOverdue >= TASK_ESCALATION_DAYS) {
          if (task.assignee && task.assignee.id !== task.creatorId) {
            await createNotification({
              userId: task.creatorId,
              type: 'TASK_ESCALATED',
              title: 'Task Escalated to Manager',
              message: `Task "${task.title}" has been overdue for ${daysOverdue} days. Escalated to manager.`,
              metadata: { taskId: task.id, daysOverdue },
              taskId: task.id,
            });

            const managers = await tx.user.findMany({
              where: { role: { in: ['SUPER_ADMIN', 'MANAGER'] }, isActive: true },
              select: { id: true },
            });

            for (const mgr of managers) {
              await createNotification({
                userId: mgr.id,
                type: 'TASK_ESCALATED',
                title: 'Task Overdue Escalation',
                message: `Task "${task.title}" assigned to ${task.assignee.name || task.assignee.email} is overdue (${daysOverdue} days).`,
                metadata: { taskId: task.id, assigneeId: task.assigneeId, daysOverdue },
                taskId: task.id,
              });
            }

            stats.taskEscalationsSent++;
          }
        }
      }

      // Task "due tomorrow" reminder
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      const dayAfterTomorrow = new Date(tomorrow);
      dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);

      const dueTomorrowTasks = await tx.task.findMany({
        where: {
          deletedAt: null,
          status: { notIn: ['CLOSED' as any, 'COMPLETED'] },
          dueDate: { gte: tomorrow, lt: dayAfterTomorrow },
        },
      });

      for (const task of dueTomorrowTasks) {
        await createNotification({
          userId: task.assigneeId,
          type: 'TASK_DUE_TOMORROW',
          title: 'Task Due Tomorrow',
          message: `Task "${task.title}" is due tomorrow.`,
          metadata: { taskId: task.id },
          taskId: task.id,
        });

        stats.taskRemindersSent++;
      }

      // (e) Generate next occurrence for recurring alerts completed but not yet regenerated
      const completedRecurringAlerts = await tx.alert.findMany({
        where: {
          deletedAt: null,
          status: 'COMPLETED',
          recurrence: { not: 'ONE_TIME' },
          childAlerts: {
            none: {
              status: { in: ['OPEN', 'IN_PROGRESS', 'SUBMITTED', 'OVERDUE'] },
            },
          },
        },
      });

      for (const alert of completedRecurringAlerts) {
        if (alert.recurrenceEndDate && new Date(alert.recurrenceEndDate) <= today) {
          continue;
        }

        const nextDueDate = calculateNextDueDate(alert.dueDate, alert.recurrence, alert.recurrenceIntervalDays ?? undefined);

        if (nextDueDate && nextDueDate > today) {
          const existingNext = await tx.alert.findFirst({
            where: { parentAlertId: alert.id, status: { in: ['OPEN', 'IN_PROGRESS', 'SUBMITTED', 'OVERDUE'] } },
          });

          if (!existingNext) {
            const nextAlert = await tx.alert.create({
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

            const reminderRules = await tx.alertReminderRule.findMany({
              where: { alertId: alert.id },
            });
            if (reminderRules.length > 0) {
              await tx.alertReminderRule.createMany({
                data: reminderRules.map((rule) => ({
                  alertId: nextAlert.id,
                  daysBefore: rule.daysBefore,
                  isActive: rule.isActive,
                })),
              });
            }

            const escalationRules = await tx.alertEscalationRule.findMany({
              where: { alertId: alert.id },
            });
            if (escalationRules.length > 0) {
              await tx.alertEscalationRule.createMany({
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

            stats.recurrencesGenerated++;
          }
        }
      }

      await tx.jobRun.create({
        data: {
          jobName: 'daily-job',
          runDate: runDateKey,
          status: 'SUCCESS',
          result: stats as any,
        },
      });
    });

    return {
      jobName: 'daily-job',
      runDate: today,
      success: true,
      stats,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);

    await prisma.jobRun.create({
      data: {
        jobName: 'daily-job',
        runDate: runDateKey,
        status: 'FAILED',
        error: errorMsg,
      },
    }).catch(() => {});

    return {
      jobName: 'daily-job',
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

export async function runJobByName(jobName: string): Promise<JobResult> {
  if (jobName === 'daily-job') {
    return runDailyJob();
  }
  throw new Error(`Unknown job: ${jobName}`);
}
