import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createAuditLog } from '@/lib/audit';
import { hasMinRole } from '@/lib/rbac';
import { ALLOWED_EVIDENCE_TYPES, MAX_EVIDENCE_SIZE } from '@/lib/alert-rules';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

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

    const evidence = await prisma.alertEvidence.findMany({
      where: { alertId: id },
      include: { uploadedBy: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(evidence);
  } catch (error) {
    console.error('GET /api/alerts/[id]/evidence error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

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

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!ALLOWED_EVIDENCE_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'File type not allowed. Allowed types: PDF, PNG, JPG, DOCX, XLSX' },
        { status: 400 }
      );
    }

    if (file.size > MAX_EVIDENCE_SIZE) {
      return NextResponse.json({ error: 'File size exceeds 10 MB limit' }, { status: 400 });
    }

    const uploadsDir = join(process.cwd(), 'public', 'uploads');
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true });
    }

    const timestamp = Date.now();
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const fileName = `alert-${timestamp}-${sanitizedName}`;
    const filePath = join(uploadsDir, fileName);

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    const evidence = await prisma.alertEvidence.create({
      data: {
        alertId: id,
        fileName: file.name,
        filePath: `/uploads/${fileName}`,
        mimeType: file.type,
        size: file.size,
        uploadedById: userId,
      },
      include: { uploadedBy: { select: { id: true, name: true, email: true } } },
    });

    await createAuditLog({
      action: 'CREATE',
      entity: 'AlertEvidence',
      entityId: evidence.id,
      userId: session.user.id,
      alertId: id,
      newData: { fileName: evidence.fileName, mimeType: evidence.mimeType, size: evidence.size },
    });

    return NextResponse.json(evidence, { status: 201 });
  } catch (error) {
    console.error('POST /api/alerts/[id]/evidence error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}