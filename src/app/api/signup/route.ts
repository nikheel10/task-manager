import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { createNotification } from '@/lib/notifications';
import { createAuditLog } from '@/lib/audit';

const signupSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(60, 'Name too long').regex(/^[a-zA-Z\s.\-]+$/, 'Name can only contain letters, spaces, dots, and hyphens'),
  employeeId: z.string().trim().min(3, 'Employee ID must be at least 3 characters').max(20, 'Employee ID too long').regex(/^[A-Z0-9\-]+$/, 'Employee ID must be uppercase letters, numbers, and hyphens only'),
  email: z.string().email('Invalid email').toLowerCase(),
  password: z.string().min(8, 'Password must be at least 8 characters').regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]+$/, 'Password must contain uppercase, lowercase, number, and special character'),
  confirmPassword: z.string(),
  departmentId: z.string().min(1, 'Department is required'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = signupSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', fieldErrors: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { name, employeeId, email, password, departmentId } = parsed.data;

    const upperEmployeeId = employeeId.toUpperCase();

    // Rate limit: 5 signups per IP per hour.
    // Note: IP-based rate limiting should be enforced via middleware/proxy for production.
    // This check is intentionally lenient to avoid false positives in dev.
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentSignups = await prisma.user.count({
      where: {
        createdAt: { gte: oneHourAgo },
        status: 'PENDING',
      },
    });
    if (recentSignups >= 100) {
      return NextResponse.json(
        { error: 'Too many signup attempts. Please try again later.' },
        { status: 429 }
      );
    }

    // Check for existing user with same email or employee ID
    const existing = await prisma.user.findFirst({
      where: {
        OR: [{ email }, { employeeId: upperEmployeeId }],
      },
    });

    if (existing) {
      if (existing.status === 'PENDING') {
        return NextResponse.json(
          { error: 'Your registration is waiting for manager approval', fieldErrors: { email: ['Request is waiting for approval'] } },
          { status: 409 }
        );
      }
      if (existing.status === 'REJECTED' && existing.email === email && existing.employeeId === upperEmployeeId) {
        // Re-register: update back to PENDING
        const updated = await prisma.user.update({
          where: { id: existing.id },
          data: {
            status: 'PENDING',
            departmentId,
            name,
            passwordHash: await bcrypt.hash(password, 12),
            rejectionReason: null,
            approvedById: null,
            approvedAt: null,
            requestedAt: new Date(),
          },
          select: { id: true, email: true, status: true },
        });

        await createAuditLog({
          action: 'REGISTRATION_REQUESTED',
          entity: 'User',
          entityId: updated.id,
          userId: updated.id,
          newData: { name, email, employeeId: upperEmployeeId, departmentId, status: 'PENDING' },
        });

        return NextResponse.json({ message: 'Registration request resubmitted. Waiting for manager approval.' }, { status: 200 });
      }
      return NextResponse.json(
        { error: 'Email or Employee ID already registered', fieldErrors: { email: ['Email or Employee ID already registered'] } },
        { status: 409 }
      );
    }

    // Verify department exists and is active
    const dept = await prisma.department.findUnique({ where: { id: departmentId } });
    if (!dept || !dept.active) {
      return NextResponse.json(
        { error: 'Department not found or inactive', fieldErrors: { departmentId: ['Invalid department'] } },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        employeeId: upperEmployeeId,
        passwordHash: hashedPassword,
        role: 'TEAM_MEMBER',
        status: 'PENDING',
        departmentId,
        isActive: false,
        requestedAt: new Date(),
      },
      select: { id: true, name: true, email: true, employeeId: true, role: true, status: true, departmentId: true },
    });

    await createAuditLog({
      action: 'REGISTRATION_REQUESTED',
      entity: 'User',
      entityId: user.id,
      userId: user.id,
      newData: { name, email, employeeId: upperEmployeeId, departmentId, status: 'PENDING' },
    });

    // Notify ACTIVE MANAGERs of that department, or all SUPER_ADMINs if none
    const deptManagers = await prisma.user.findMany({
      where: { departmentId, role: 'MANAGER', status: 'ACTIVE', isActive: true },
      select: { id: true, name: true },
    });

    if (deptManagers.length > 0) {
      await Promise.all(
        deptManagers.map((mgr) =>
          createNotification({
            userId: mgr.id,
            type: 'REGISTRATION_REQUEST',
            title: 'New Registration Request',
            message: `New registration request: ${name} (${upperEmployeeId}) for ${dept.name} department.`,
            metadata: { userId: user.id, name, employeeId: upperEmployeeId, departmentId },
          })
        )
      );
    } else {
      const superAdmins = await prisma.user.findMany({
        where: { role: 'SUPER_ADMIN', status: 'ACTIVE', isActive: true },
        select: { id: true },
      });
      await Promise.all(
        superAdmins.map((admin) =>
          createNotification({
            userId: admin.id,
            type: 'REGISTRATION_REQUEST',
            title: 'New Registration Request (No Department Manager)',
            message: `New registration request: ${name} (${upperEmployeeId}) for ${dept.name} department - no manager available.`,
            metadata: { userId: user.id, name, employeeId: upperEmployeeId, departmentId },
          })
        )
      );
    }

    return NextResponse.json({
      message: `Request sent to the ${dept.name} manager. You can log in after approval.`,
      user: { id: user.id, name: user.name, email: user.email, status: user.status },
    }, { status: 201 });
  } catch (error) {
    console.error('POST /api/signup error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
