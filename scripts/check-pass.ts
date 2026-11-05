import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Check password hash
  const admin = await prisma.user.findUnique({ where: { email: 'admin@demo.com' } });
  if (!admin) {
    console.log('Admin user not found!');
    return;
  }
  
  console.log('Admin user found:', admin.email, admin.role);
  console.log('Password hash:', admin.passwordHash);
  console.log('Hash length:', admin.passwordHash.length);
  
  const match = await bcrypt.compare('Admin@123', admin.passwordHash);
  console.log('Password match:', match);
  
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
