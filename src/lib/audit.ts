import { prisma } from '@/lib/prisma';

export interface AuditLogData {
  action: string;
  entity: string;
  entityId: string;
  userId: string;
  taskId?: string;
  alertId?: string;
  oldData?: Record<string, unknown>;
  newData?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export async function createAuditLog(data: AuditLogData) {
  try {
    await prisma.auditLog.create({
      data: {
        action: data.action,
        entity: data.entity,
        entityId: data.entityId,
        userId: data.userId,
        taskId: data.taskId ?? undefined,
        alertId: data.alertId ?? undefined,
        oldData: data.oldData as any,
        newData: data.newData as any,
        metadata: data.metadata as any,
      },
    });
  } catch (error) {
    console.error('Failed to create audit log:', error);
  }
}