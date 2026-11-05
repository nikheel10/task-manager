import { prisma } from '@/lib/prisma';

export interface NotificationData {
  userId: string;
  type: string;
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
  taskId?: string;
  alertId?: string;
}

export async function createNotification(data: NotificationData) {
  try {
    await prisma.notification.create({
      data: {
        userId: data.userId,
        type: data.type,
        title: data.title,
        message: data.message,
        metadata: data.metadata as any,
        taskId: data.taskId,
        alertId: data.alertId,
      },
    });
  } catch (error) {
    console.error('Failed to create notification:', error);
  }
}

export async function createNotificationsForUsers(
  userIds: string[],
  type: string,
  title: string,
  message: string,
  metadata?: Record<string, unknown>,
  taskAlertRef?: { taskId?: string; alertId?: string }
) {
  await Promise.all(
    userIds.map((userId) =>
      createNotification({
        userId,
        type,
        title,
        message,
        metadata,
        ...taskAlertRef,
      })
    )
  );
}

export interface NotificationWithRefs {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  readAt: Date | null;
  metadata: Record<string, unknown> | null;
  taskId: string | null;
  alertId: string | null;
  userId: string;
  createdAt: string;
}