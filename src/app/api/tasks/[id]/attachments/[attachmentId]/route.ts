import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createAuditLog } from '@/lib/audit';
import { canModifyTask } from '@/lib/rbac';
import { unlink } from 'fs/promises';
import { join } from 'path';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; attachmentId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, attachmentId } = await params;
    const task = await prisma.task.findFirst({
      where: { id, deletedAt: null },
    });

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    const userId = session.user.id;
    const userRole = session.user.role as 'SUPER_ADMIN' | 'MANAGER' | 'TEAM_MEMBER' | 'VIEWER';

    if (!canModifyTask(userRole, userId, task.assigneeId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const attachment = await prisma.taskAttachment.findFirst({
      where: { id: attachmentId, taskId: id },
    });

    if (!attachment) {
      return NextResponse.json({ error: 'Attachment not found' }, { status: 404 });
    }

    // Delete file from filesystem
    const filePath = join(process.cwd(), 'public', attachment.filePath);
    try {
      await unlink(filePath);
    } catch {
      // File might not exist, continue with DB deletion
    }

    // Delete from database
    await prisma.taskAttachment.delete({ where: { id: attachmentId } });

    await createAuditLog({
      action: 'DELETE',
      entity: 'TaskAttachment',
      entityId: attachmentId,
      userId: session.user.id,
      taskId: id,
      oldData: { fileName: attachment.fileName, mimeType: attachment.mimeType, size: attachment.size },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/tasks/[id]/attachments/[attachmentId] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}