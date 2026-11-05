// @ts-ignore - next-auth v5 beta is ESM-only; require works with Turbopack
const NextAuth: typeof import('next-auth')['default'] = require('next-auth').default;
// @ts-ignore - next-auth v5 beta is ESM-only; require works with Turbopack
const Credentials: typeof import('next-auth/providers/credentials')['default'] = require('next-auth/providers/credentials').default;
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { checkLoginRateLimit, resetLoginRateLimit } from '@/lib/rate-limit';

const config = {
  pages: {
    signIn: '/login',
    error: '/login',
  },
  session: {
    strategy: 'jwt' as const,
    maxAge: 60 * 60 * 24 * 7,
  },
  callbacks: {
    async jwt({ token, user }: { token: any; user: any }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
        token.departmentId = (user as any).departmentId ?? null;
        token.departmentHasGlobalAccess = (user as any).departmentHasGlobalAccess ?? false;
      }
      return token;
    },
    async session({ session, token }: { session: any; token: any }) {
      return {
        ...session,
        user: {
          ...session.user,
          id: token.id as string,
          name: token.name as string,
          email: token.email as string,
          role: token.role as string,
          departmentId: token.departmentId as string | null,
          departmentHasGlobalAccess: token.departmentHasGlobalAccess as boolean,
        },
      };
    },
  },
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
        departmentId: { label: 'Department', type: 'text' },
      },
      authorize: async (credentials?: Record<string, any>) => {
        const parsed = z
          .object({
            email: z.string().email(),
            password: z.string().min(1),
            departmentId: z.string().optional(),
          })
          .safeParse(credentials);

        if (!parsed.success) return null;

        const { email, password, departmentId } = parsed.data;

        const rateLimit = checkLoginRateLimit(email);
        if (!rateLimit.allowed) return null;

        const user = await prisma.user.findUnique({ 
          where: { email },
          include: {
            department: {
              select: { hasGlobalAccess: true }
            }
          }
        });

        if (!user || !user.isActive) {
          return null;
        }

        if (user.status !== 'ACTIVE') {
          return null;
        }

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) {
          return null;
        }

        if (departmentId && (!user.departmentId || user.departmentId !== departmentId)) {
          return null;
        }

        resetLoginRateLimit(email);

        return {
          id: user.id,
          name: user.name ?? '',
          email: user.email,
          role: user.role as string,
          departmentId: user.departmentId ?? null,
          departmentHasGlobalAccess: user.department?.hasGlobalAccess ?? false,
        };
      },
    }),
  ],
};

const { handlers, signIn, signOut, auth } = NextAuth(config);
export { handlers, signIn, signOut, auth };