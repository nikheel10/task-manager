import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const departments = await prisma.department.findMany({
    where: { active: true },
    select: { id: true, name: true, code: true, hasGlobalAccess: true },
    orderBy: { name: 'asc' },
  });
  return NextResponse.json({ departments });
}
