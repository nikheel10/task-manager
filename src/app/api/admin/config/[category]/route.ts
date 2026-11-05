import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { requireRole } from '@/lib/rbac';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const configItemSchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  color: z.string().optional(),
  sortOrder: z.number().optional(),
  isActive: z.boolean().optional(),
});

// Default task categories
const DEFAULT_TASK_CATEGORIES = [
  { key: 'liaisoning', label: 'Liaisoning', color: 'bg-blue-500', sortOrder: 1 },
  { key: 'legal', label: 'Legal', color: 'bg-indigo-500', sortOrder: 2 },
  { key: 'documentation', label: 'Documentation', color: 'bg-purple-500', sortOrder: 3 },
  { key: 'site_execution', label: 'Site/Execution', color: 'bg-teal-500', sortOrder: 4 },
  { key: 'finance', label: 'Finance', color: 'bg-amber-500', sortOrder: 5 },
];

// Default entity types
const DEFAULT_ENTITY_TYPES = [
  { key: 'COMPANY', label: 'Company', color: 'bg-blue-500', sortOrder: 1 },
  { key: 'SITE', label: 'Site', color: 'bg-green-500', sortOrder: 2 },
  { key: 'ASSET', label: 'Asset', color: 'bg-purple-500', sortOrder: 3 },
  { key: 'PROJECT', label: 'Project', color: 'bg-orange-500', sortOrder: 4 },
  { key: 'OTHER', label: 'Other', color: 'bg-gray-500', sortOrder: 5 },
];

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ category: string }> }
) {
  try {
    const session = await requireRole('SUPER_ADMIN');
    const { category } = await params;

    if (category === 'task-categories') {
      return NextResponse.json({ categories: DEFAULT_TASK_CATEGORIES });
    }

    if (category === 'entity-types') {
      return NextResponse.json({ types: DEFAULT_ENTITY_TYPES });
    }

    return NextResponse.json({ error: 'Unknown category' }, { status: 400 });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'UNAUTHENTICATED') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      if (error.message === 'FORBIDDEN') {
        return NextResponse.json({ error: 'Forbidden: SUPER_ADMIN role required' }, { status: 403 });
      }
    }
    console.error('GET /api/admin/config/[category] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ category: string }> }
) {
  try {
    const session = await requireRole('SUPER_ADMIN');
    const { category } = await params;
    const body = await request.json();
    const parsed = configItemSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', fieldErrors: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    // In a full implementation, these would be stored in DB.
    // For now, we return success and the item.
    return NextResponse.json({ ...parsed.data, saved: true });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'UNAUTHENTICATED') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      if (error.message === 'FORBIDDEN') {
        return NextResponse.json({ error: 'Forbidden: SUPER_ADMIN role required' }, { status: 403 });
      }
    }
    console.error('POST /api/admin/config/[category] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
