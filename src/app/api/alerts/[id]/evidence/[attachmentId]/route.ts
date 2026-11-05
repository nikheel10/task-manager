import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createAuditLog } from '@/lib/audit';
import { hasMinRole } from '@/lib/rbac';
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

    const alert = await prisma.alert.findFirst({
      where: { id, deletedAt: null },
    });

    if (!alert) {
      return NextResponse.json({ error: 'Alert not found' }, { status: 404 });
    }

    const userId = session.user.id;
    const userRole = session.user.role as 'SUPER_ADMIN' | 'MANAGER' | 'TEAM_MEMBER' | 'VIEWER';

    if (userRole === 'VIEWER' || (userRole === 'TEAM_MEMBER' && alert.ownerId !== userId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const evidence = await prisma.alertEvidence.findFirst({
      where: { id: attachmentId, alertId: id },
    });

    if (!evidence) {
      return NextResponse.json({ error: 'Evidence not found' }, { status: 404 });
    }

    const filePath = join(process.cwd(), 'public', evidence.filePath);
    try {
      await unlink(filePath);
    } catch {}

    await prisma.alertEvidence.delete({ where: { id: attachmentId } });

    await createAuditLog({
      action: 'DELETE',
      entity: 'AlertEvidence',
      entityId: attachmentId,
      userId: session.user.id,
      alertId: id,
      oldData: { fileName: evidence.fileName, mimeType: evidence.mimeType, size: evidence.size },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/alerts/[id]/evidence/[attachmentId] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}