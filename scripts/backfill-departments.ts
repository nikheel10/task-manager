import { prisma } from '../src/lib/prisma';

const DEPARTMENTS = [
  { name: 'Liaisoning & Approvals', code: 'LIA' },
  { name: 'Legal', code: 'LEG' },
  { name: 'Compliance & Regulatory', code: 'CMP' },
  { name: 'Projects & Construction', code: 'PRJ' },
  { name: 'Finance & Accounts', code: 'FIN' },
  { name: 'Documentation & Records', code: 'DOC' },
  { name: 'HR & Admin', code: 'HR' },
];

export async function main() {
  console.log('🔄 Backfilling departments and data...');

  // Create departments
  const depts: Record<string, any> = {};
  for (const d of DEPARTMENTS) {
    const dept = await prisma.department.upsert({
      where: { code: d.code },
      update: { name: d.name, active: true },
      create: { name: d.name, code: d.code, active: true },
    });
    depts[d.code] = dept;
    console.log(`  ✅ Department: ${dept.name} (${dept.code})`);
  }

  const liaisoningDept = depts['LIA'];

  // Assign all existing users to Liaisoning & Approvals, except SUPER_ADMIN and MD (null)
  const users = await prisma.user.findMany();
  for (const user of users) {
    if (user.role === 'SUPER_ADMIN' || user.role === 'MD') {
      await prisma.user.update({
        where: { id: user.id },
        data: { departmentId: null },
      });
    } else {
      await prisma.user.update({
        where: { id: user.id },
        data: { departmentId: liaisoningDept.id },
      });
    }
    console.log(`  ✅ User ${user.email} -> ${user.role === 'SUPER_ADMIN' || user.role === 'MD' ? 'null (global)' : liaisoningDept.name}`);
  }

  // Assign all existing tasks to Liaisoning & Approvals department
  const tasks = await prisma.task.findMany();
  for (const task of tasks) {
    await prisma.task.update({
      where: { id: task.id },
      data: {
        departmentId: liaisoningDept.id,
        originDepartmentId: liaisoningDept.id,
        isCrossDepartment: false,
      },
    });
    console.log(`  ✅ Task ${task.taskNumber} -> ${liaisoningDept.name}`);
  }

  // Assign all existing alerts to Liaisoning & Approvals department
  const alerts = await prisma.alert.findMany();
  for (const alert of alerts) {
    await prisma.alert.update({
      where: { id: alert.id },
      data: { departmentId: liaisoningDept.id },
    });
    console.log(`  ✅ Alert ${alert.alertNumber} -> ${liaisoningDept.name}`);
  }

  // Assign all existing projects to Liaisoning & Approvals department
  const projects = await prisma.project.findMany();
  for (const project of projects) {
    await prisma.project.update({
      where: { id: project.id },
      data: { departmentId: liaisoningDept.id },
    });
    console.log(`  ✅ Project ${project.name} -> ${liaisoningDept.name}`);
  }

  console.log('\n✅ Backfill complete!');
}

main()
  .catch((e) => {
    console.error('❌ Backfill failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
