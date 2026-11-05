import { prisma } from '../src/lib/prisma';
import bcrypt from 'bcryptjs';

const DEPARTMENTS = [
  { name: 'Liaisoning & Approvals', code: 'LIA', hasGlobalAccess: false },
  { name: 'Legal', code: 'LEG', hasGlobalAccess: false },
  { name: 'Compliance & Regulatory', code: 'CMP', hasGlobalAccess: false },
  { name: 'Projects & Construction', code: 'PRJ', hasGlobalAccess: false },
  { name: 'Finance & Accounts', code: 'FIN', hasGlobalAccess: false },
  { name: 'Documentation & Records', code: 'DOC', hasGlobalAccess: false },
  { name: 'HR & Admin', code: 'HR', hasGlobalAccess: true },
];

// Department-specific task categories with codes
const DEPT_CATEGORIES: Record<string, Array<{ name: string; code: string; sortOrder: number; checklist?: Array<{ label: string; mandatory: boolean; sortOrder: number }> }>> = {
  LIA: [
    { name: 'NOC / Permission', code: 'NOC', sortOrder: 1, checklist: [{ label: 'Application submitted', mandatory: true, sortOrder: 1 }, { label: 'Fee paid', mandatory: true, sortOrder: 2 }, { label: 'Acknowledgement received', mandatory: false, sortOrder: 3 }] },
    { name: 'Application Filing', code: 'APP', sortOrder: 2 },
    { name: 'Authority Follow-up', code: 'AUTH', sortOrder: 3 },
    { name: 'Site Visit / Meeting', code: 'SITE', sortOrder: 4 },
    { name: 'Other', code: 'OTH', sortOrder: 5 },
  ],
  LEG: [
    { name: 'Agreement / Contract', code: 'AGR', sortOrder: 1 },
    { name: 'Legal Notice', code: 'NOT', sortOrder: 2 },
    { name: 'Title / Document Review', code: 'TIT', sortOrder: 3 },
    { name: 'Litigation Support', code: 'LIT', sortOrder: 4 },
    { name: 'Other', code: 'OTH', sortOrder: 5 },
  ],
  CMP: [
    { name: 'Statutory Filing', code: 'STA', sortOrder: 1 },
    { name: 'License Renewal', code: 'LIC', sortOrder: 2 },
    { name: 'Inspection / Audit', code: 'INS', sortOrder: 3 },
    { name: 'Insurance', code: 'INS', sortOrder: 4 },
    { name: 'Other', code: 'OTH', sortOrder: 5 },
  ],
  PRJ: [
    { name: 'Design', code: 'DES', sortOrder: 1 },
    { name: 'Construction Work', code: 'CON', sortOrder: 2 },
    { name: 'Inspection / Quality', code: 'INQ', sortOrder: 3 },
    { name: 'Procurement', code: 'PRO', sortOrder: 4 },
    { name: 'Other', code: 'OTH', sortOrder: 5 },
  ],
  FIN: [
    { name: 'Payment', code: 'PAY', sortOrder: 1 },
    { name: 'Tax / Challan', code: 'TAX', sortOrder: 2 },
    { name: 'Invoice / Billing', code: 'INV', sortOrder: 3 },
    { name: 'Reconciliation', code: 'REC', sortOrder: 4 },
    { name: 'Other', code: 'OTH', sortOrder: 5 },
  ],
  DOC: [
    { name: 'Drawing Upload', code: 'DWG', sortOrder: 1 },
    { name: 'Document Collection', code: 'DOC', sortOrder: 2 },
    { name: 'Record Update', code: 'REC', sortOrder: 3 },
    { name: 'Certification', code: 'CER', sortOrder: 4 },
    { name: 'Other', code: 'OTH', sortOrder: 5 },
  ],
  HR: [
    { name: 'Onboarding', code: 'ONB', sortOrder: 1 },
    { name: 'Attendance / Leave', code: 'ATT', sortOrder: 2 },
    { name: 'Office Admin', code: 'ADM', sortOrder: 3 },
    { name: 'Procurement', code: 'PRO', sortOrder: 4 },
    { name: 'Other', code: 'OTH', sortOrder: 5 },
  ],
};

const DEMO_USERS = [
  { email: 'admin@demo.com', name: 'System Administrator', password: 'Admin@123', role: 'SUPER_ADMIN' as const, departmentId: null as string | null, employeeId: 'EMP-0001', status: 'ACTIVE' as const },
  { email: 'md@demo.com', name: 'Managing Director', password: 'Md@1234', role: 'MD' as const, departmentId: null as string | null, employeeId: 'EMP-0002', status: 'ACTIVE' as const },
  // Construction department users
  { email: 'construction.manager@demo.com', name: 'Construction Manager', password: 'Manager@123', role: 'MANAGER' as const, departmentId: 'PRJ', employeeId: 'EMP-1001', status: 'ACTIVE' as const },
  { email: 'construction.member@demo.com', name: 'Construction Member', password: 'Member@123', role: 'TEAM_MEMBER' as const, departmentId: 'PRJ', employeeId: 'EMP-1002', status: 'ACTIVE' as const },
  // Legal department users
  { email: 'legal.manager@demo.com', name: 'Legal Manager', password: 'Manager@123', role: 'MANAGER' as const, departmentId: 'LEG', employeeId: 'EMP-2001', status: 'ACTIVE' as const },
  // HR & Admin department users (hasGlobalAccess = true)
  { email: 'hr.manager@demo.com', name: 'HR Manager', password: 'Manager@123', role: 'MANAGER' as const, departmentId: 'HR', employeeId: 'EMP-6001', status: 'ACTIVE' as const },
  { email: 'hr.member@demo.com', name: 'HR Member', password: 'Member@123', role: 'TEAM_MEMBER' as const, departmentId: 'HR', employeeId: 'EMP-6002', status: 'ACTIVE' as const },
  // Viewer for Construction
  { email: 'viewer.construction@demo.com', name: 'Construction Viewer', password: 'Viewer@123', role: 'VIEWER' as const, departmentId: 'PRJ', employeeId: 'EMP-1003', status: 'ACTIVE' as const },
  // Existing users for backward compatibility
  { email: 'manager.liaisoning@demo.com', name: 'Liaisoning Manager', password: 'Manager@123', role: 'MANAGER' as const, departmentId: 'LIA', employeeId: 'EMP-3001', status: 'ACTIVE' as const },
  { email: 'member.liaisoning.1@demo.com', name: 'Liaisoning Member 1', password: 'Member@123', role: 'TEAM_MEMBER' as const, departmentId: 'LIA', employeeId: 'EMP-3002', status: 'ACTIVE' as const },
  { email: 'member.liaisoning.2@demo.com', name: 'Liaisoning Member 2', password: 'Member@123', role: 'TEAM_MEMBER' as const, departmentId: 'LIA', employeeId: 'EMP-3003', status: 'ACTIVE' as const },
  { email: 'manager.legal@demo.com', name: 'Legal Manager 2', password: 'Manager@123', role: 'MANAGER' as const, departmentId: 'LEG', employeeId: 'EMP-2002', status: 'ACTIVE' as const },
  { email: 'member.legal.1@demo.com', name: 'Legal Member 1', password: 'Member@123', role: 'TEAM_MEMBER' as const, departmentId: 'LEG', employeeId: 'EMP-2003', status: 'ACTIVE' as const },
  { email: 'member.legal.2@demo.com', name: 'Legal Member 2', password: 'Member@123', role: 'TEAM_MEMBER' as const, departmentId: 'LEG', employeeId: 'EMP-2004', status: 'ACTIVE' as const },
  { email: 'manager.compliance@demo.com', name: 'Compliance Manager', password: 'Manager@123', role: 'MANAGER' as const, isComplianceOwner: true, departmentId: 'CMP', employeeId: 'EMP-4001', status: 'ACTIVE' as const },
  { email: 'member.compliance.1@demo.com', name: 'Compliance Member 1', password: 'Member@123', role: 'TEAM_MEMBER' as const, departmentId: 'CMP', employeeId: 'EMP-4002', status: 'ACTIVE' as const },
  { email: 'member.compliance.2@demo.com', name: 'Compliance Member 2', password: 'Member@123', role: 'TEAM_MEMBER' as const, departmentId: 'CMP', employeeId: 'EMP-4003', status: 'ACTIVE' as const },
  { email: 'viewer.liaisoning@demo.com', name: 'Liaisoning Viewer', password: 'Viewer@123', role: 'VIEWER' as const, departmentId: 'LIA', employeeId: 'EMP-3004', status: 'ACTIVE' as const },
  // Pending registration request
  { email: 'pending.member@demo.com', name: 'Pending Member', password: 'Member@123', role: 'TEAM_MEMBER' as const, departmentId: 'PRJ', employeeId: 'EMP-9001', status: 'PENDING' as const },
];

export async function main() {
  console.log('🌱 Seeding database...');

  // Clean up existing test data for idempotent re-seeding
  await prisma.notification.deleteMany({});
  await prisma.auditLog.deleteMany({});
  await prisma.taskComment.deleteMany({});
  await prisma.taskChecklist.deleteMany({});
  await prisma.taskVerification.deleteMany({});
  await prisma.taskAttachment.deleteMany({});
  await prisma.taskAssignment.deleteMany({});
  await prisma.task.deleteMany({});
  await prisma.alertReminderRule.deleteMany({});
  await prisma.alertEscalationRule.deleteMany({});
  await prisma.alertComment.deleteMany({});
  await prisma.alertEvidence.deleteMany({});
  await prisma.alertReminderLog.deleteMany({});
  await prisma.alert.deleteMany({});
  await prisma.jobRun.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.department.deleteMany({});
  await prisma.project.deleteMany({});
  await prisma.taskCategory.deleteMany({});
  await prisma.taskCategoryChecklist.deleteMany({});
  await prisma.milestone.deleteMany({});
  await prisma.entity.deleteMany({});

  // Create departments
  const depts: Record<string, any> = {};
  for (const d of DEPARTMENTS) {
    const dept = await prisma.department.create({
      data: { name: d.name, code: d.code, active: true, hasGlobalAccess: d.hasGlobalAccess },
    });
    depts[d.code] = dept;
    console.log(`  ✅ Department: ${dept.name} (${dept.code})${d.hasGlobalAccess ? ' [GLOBAL ACCESS]' : ''}`);
  }

  // Create users with department assignments
  const users: Record<string, any> = {};
  for (const u of DEMO_USERS) {
    const passwordHash = await bcrypt.hash(u.password, 10);
    const resolvedDeptId = u.departmentId ? depts[u.departmentId as keyof typeof depts]?.id : null;
    const user = await prisma.user.create({
      data: {
        email: u.email,
        name: u.name,
        passwordHash,
        role: u.role,
        status: u.status,
        isActive: u.status === 'ACTIVE',
        isComplianceOwner: u.isComplianceOwner ?? false,
        employeeId: u.employeeId,
        departmentId: resolvedDeptId,
        requestedAt: u.status === 'PENDING' ? new Date() : undefined,
        approvedById: null,
        approvedAt: u.status === 'ACTIVE' ? new Date() : undefined,
      },
    });
    users[u.email] = user;
    const deptName = resolvedDeptId ? depts[u.departmentId as keyof typeof depts]?.name : '(global)';
    console.log(`  ✅ User: ${user.email} (${user.role} -> ${deptName}) [${u.status}] [${u.employeeId}]`);
  }

  const admin = users['admin@demo.com'];
  const md = users['md@demo.com'];
  const constructionManager = users['construction.manager@demo.com'];
  const constructionMember = users['construction.member@demo.com'];
  const legalManager = users['legal.manager@demo.com'];
  const hrManager = users['hr.manager@demo.com'];
  const hrMember = users['hr.member@demo.com'];
  const constructionViewer = users['viewer.construction@demo.com'];
  const managerLiaisoning = users['manager.liaisoning@demo.com'];
  const memberLiaisoning1 = users['member.liaisoning.1@demo.com'];
  const memberLiaisoning2 = users['member.liaisoning.2@demo.com'];
  const managerLegal = users['manager.legal@demo.com'];
  const memberLegal1 = users['member.legal.1@demo.com'];
  const memberLegal2 = users['member.legal.2@demo.com'];
  const managerCompliance = users['manager.compliance@demo.com'];
  const memberCompliance1 = users['member.compliance.1@demo.com'];
  const memberCompliance2 = users['member.compliance.2@demo.com'];
  const viewerLiaisoning = users['viewer.liaisoning@demo.com'];
  const pendingMember = users['pending.member@demo.com'];

  const liaisoningDept = depts['LIA'];
  const legalDept = depts['LEG'];
  const complianceDept = depts['CMP'];
  const constructionDept = depts['PRJ'];
  const hrDept = depts['HR'];

  // Create projects per department
  const projects: Record<string, any> = {};
  for (const deptCode of ['LIA', 'LEG', 'CMP', 'PRJ', 'FIN', 'DOC', 'HR']) {
    const project = await prisma.project.create({
      data: {
        name: `${depts[deptCode].name} Project`,
        description: `Default project for ${depts[deptCode].name}`,
        departmentId: depts[deptCode].id,
        isActive: true,
      },
    });
    projects[deptCode] = project;
  }

  // Create task categories per department
  const categories: Record<string, any> = {};
  for (const deptCode of Object.keys(DEPT_CATEGORIES)) {
    const deptCats = DEPT_CATEGORIES[deptCode];
    for (const cat of deptCats) {
      const category = await prisma.taskCategory.create({
        data: {
          name: cat.name,
          code: cat.code,
          departmentId: depts[deptCode].id,
          active: true,
          sortOrder: cat.sortOrder,
        },
      });
      categories[`${deptCode}-${cat.code}`] = category;
      console.log(`  ✅ Category: ${category.name} (${cat.code}) in ${depts[deptCode].name}`);

      // Create checklist items
      if (cat.checklist) {
        for (const chk of cat.checklist) {
          await prisma.taskCategoryChecklist.create({
            data: {
              categoryId: category.id,
              label: chk.label,
              mandatory: chk.mandatory,
              sortOrder: chk.sortOrder,
            },
          });
        }
      }
    }
  }

  // Create milestones
  const today = new Date();
  const milestone1 = await prisma.milestone.create({
    data: {
      name: 'Phase 1 - Planning',
      phaseName: 'Planning',
      dueDate: new Date(Date.now() + 30 * 86400000),
      projectId: projects['LIA'].id,
    },
  });
  const milestone2 = await prisma.milestone.create({
    data: {
      name: 'Phase 2 - Execution',
      phaseName: 'Execution',
      dueDate: new Date(Date.now() + 60 * 86400000),
      projectId: projects['LIA'].id,
    },
  });
  console.log(`  ✅ Milestones: ${milestone1.name}, ${milestone2.name}`);

  const liaisoningCat = categories['LIA-NOC'];
  const legalCat = categories['LEG-AGR'];
  const docCat = categories['DOC-DWG'];
  const financeCat = categories['FIN-PAY'];

  const pastDate = new Date(today);
  pastDate.setDate(pastDate.getDate() - 10);
  const upcomingDate = new Date(today);
  upcomingDate.setDate(upcomingDate.getDate() + 3);
  const futureDate = new Date(today);
  futureDate.setDate(futureDate.getDate() + 30);

  // Create tasks in each department
  const tasksData = [
    // Construction tasks
    {
      title: 'Construction Task - Site Inspection',
      description: 'Perform site inspection for the new building project.',
      priority: 'HIGH' as const,
      type: 'TASK' as const,
      categoryId: categories['PRJ-CON']?.id,
      milestoneId: milestone1.id,
      dueDate: upcomingDate,
      status: 'IN_PROGRESS' as const,
      assigneeId: constructionMember.id,
      creatorId: constructionManager.id,
      departmentId: constructionDept.id,
      originDepartmentId: constructionDept.id,
      isCrossDepartment: false,
      estimatedHours: 8,
    },
    // Legal tasks
    {
      title: 'Legal Task - Contract Review',
      description: 'Review vendor contract for compliance.',
      priority: 'URGENT' as const,
      type: 'TASK' as const,
      categoryId: legalCat?.id,
      milestoneId: milestone2.id,
      dueDate: pastDate,
      status: 'IN_PROGRESS' as const,
      assigneeId: memberLegal1.id,
      creatorId: legalManager.id,
      departmentId: legalDept.id,
      originDepartmentId: legalDept.id,
      isCrossDepartment: false,
      estimatedHours: 4,
    },
    // Cross-department task (Construction -> Legal)
    {
      title: 'Cross-Department Task - Compliance Audit',
      description: 'Cross-department compliance audit between Construction and Legal.',
      priority: 'HIGH' as const,
      type: 'COMPLIANCE' as const,
      categoryId: legalCat?.id,
      milestoneId: milestone1.id,
      dueDate: upcomingDate,
      status: 'NOT_STARTED' as const,
      assigneeId: legalManager.id,
      creatorId: constructionManager.id,
      departmentId: legalDept.id,
      originDepartmentId: constructionDept.id,
      isCrossDepartment: true,
      estimatedHours: 16,
    },
    // Pending verification task
    {
      title: 'Pending Verification Task',
      description: 'Task completed and waiting for manager verification.',
      priority: 'HIGH' as const,
      type: 'TASK' as const,
      categoryId: docCat?.id,
      milestoneId: milestone1.id,
      dueDate: today,
      status: 'COMPLETED' as const,
      assigneeId: memberLiaisoning2.id,
      creatorId: managerLiaisoning.id,
      departmentId: liaisoningDept.id,
      originDepartmentId: liaisoningDept.id,
      isCrossDepartment: false,
      estimatedHours: 8,
      percentComplete: 100,
    },
    // Compliance task
    {
      title: 'Compliance Task - Regulatory Filing',
      description: 'File quarterly regulatory compliance report.',
      priority: 'MEDIUM' as const,
      type: 'COMPLIANCE' as const,
      categoryId: financeCat?.id,
      milestoneId: milestone2.id,
      dueDate: futureDate,
      status: 'IN_PROGRESS' as const,
      assigneeId: memberCompliance1.id,
      creatorId: managerCompliance.id,
      departmentId: complianceDept.id,
      originDepartmentId: complianceDept.id,
      isCrossDepartment: false,
      estimatedHours: 6,
    },
    // HR task
    {
      title: 'HR Task - Employee Onboarding',
      description: 'Set up onboarding process for new hires.',
      priority: 'MEDIUM' as const,
      type: 'TASK' as const,
      categoryId: categories['HR-ONB']?.id,
      milestoneId: milestone1.id,
      dueDate: upcomingDate,
      status: 'NOT_STARTED' as const,
      assigneeId: hrMember.id,
      creatorId: hrManager.id,
      departmentId: hrDept.id,
      originDepartmentId: hrDept.id,
      isCrossDepartment: false,
      estimatedHours: 4,
    },
  ];

  const createdTasks: Record<string, any> = {};
  for (const t of tasksData) {
    const task = await prisma.task.create({
      data: {
        title: t.title,
        description: t.description,
        assigneeId: t.assigneeId,
        creatorId: t.creatorId,
        departmentId: t.departmentId,
        originDepartmentId: t.originDepartmentId,
        categoryId: t.categoryId,
        projectId: projects[t.departmentId === constructionDept.id ? 'PRJ' : 'LIA'].id,
        milestoneId: t.milestoneId,
        dueDate: t.dueDate,
        status: t.status,
        priority: t.priority,
        type: t.type,
        isCrossDepartment: t.isCrossDepartment,
        estimatedHours: t.estimatedHours,
        percentComplete: t.percentComplete ?? 0,
        taskNumber: 1000 + Object.keys(createdTasks).length,
      },
    });
    createdTasks[t.title] = task;
    console.log(`  ✅ Task: ${task.title} (TSK-${task.taskNumber})`);
  }

  // Add more tasks per department for richer data
  const moreTasksData = [
    // Liaisoning & Approvals
    {
      title: 'NOC Application - Site Office',
      description: 'Submit NOC application for temporary site office setup.',
      priority: 'HIGH' as const,
      type: 'TASK' as const,
      categoryId: categories['LIA-NOC']?.id,
      departmentId: liaisoningDept.id,
      originDepartmentId: liaisoningDept.id,
      assigneeId: memberLiaisoning1.id,
      creatorId: managerLiaisoning.id,
      isCrossDepartment: false,
      status: 'IN_PROGRESS' as const,
      estimatedHours: 6,
      dueDate: upcomingDate,
      projectId: projects['LIA'].id,
      milestoneId: milestone1.id,
    },
    {
      title: 'Authority Follow-up - Building Permit',
      description: 'Follow up with municipal authority on pending building permit.',
      priority: 'URGENT' as const,
      type: 'TASK' as const,
      categoryId: categories['LIA-AUTH']?.id,
      departmentId: liaisoningDept.id,
      originDepartmentId: liaisoningDept.id,
      assigneeId: memberLiaisoning2.id,
      creatorId: managerLiaisoning.id,
      isCrossDepartment: false,
      status: 'BLOCKED' as const,
      estimatedHours: 4,
      dueDate: pastDate,
      projectId: projects['LIA'].id,
      milestoneId: milestone2.id,
      blockedReason: 'Waiting for authority response',
    },
    // Legal
    {
      title: 'Contract Review - Vendor Agreement',
      description: 'Review and approve new vendor supply agreement.',
      priority: 'HIGH' as const,
      type: 'TASK' as const,
      categoryId: categories['LEG-AGR']?.id,
      departmentId: legalDept.id,
      originDepartmentId: legalDept.id,
      assigneeId: memberLegal2.id,
      creatorId: legalManager.id,
      isCrossDepartment: false,
      status: 'NOT_STARTED' as const,
      estimatedHours: 8,
      dueDate: futureDate,
      projectId: projects['LEG'].id,
      milestoneId: milestone1.id,
    },
    // Compliance & Regulatory
    {
      title: 'License Renewal - Annual',
      description: 'Renew annual operational license before expiry.',
      priority: 'URGENT' as const,
      type: 'COMPLIANCE' as const,
      categoryId: categories['CMP-LIC']?.id,
      departmentId: complianceDept.id,
      originDepartmentId: complianceDept.id,
      assigneeId: memberCompliance2.id,
      creatorId: managerCompliance.id,
      isCrossDepartment: false,
      status: 'IN_PROGRESS' as const,
      estimatedHours: 5,
      dueDate: upcomingDate,
      projectId: projects['CMP'].id,
      milestoneId: milestone2.id,
    },
    // Projects & Construction
    {
      title: 'Design Review - Phase 1',
      description: 'Review architectural design drawings for Phase 1.',
      priority: 'MEDIUM' as const,
      type: 'TASK' as const,
      categoryId: categories['PRJ-DES']?.id,
      departmentId: constructionDept.id,
      originDepartmentId: constructionDept.id,
      assigneeId: constructionMember.id,
      creatorId: constructionManager.id,
      isCrossDepartment: false,
      status: 'COMPLETED' as const,
      estimatedHours: 12,
      percentComplete: 100,
      dueDate: today,
      projectId: projects['PRJ'].id,
      milestoneId: milestone1.id,
    },
    // Finance & Accounts
    {
      title: 'Tax Filing - Q3',
      description: 'File quarterly tax returns for Q3.',
      priority: 'HIGH' as const,
      type: 'COMPLIANCE' as const,
      categoryId: categories['FIN-TAX']?.id,
      departmentId: depts['FIN'].id,
      originDepartmentId: depts['FIN'].id,
      assigneeId: constructionMember.id,
      creatorId: managerLiaisoning.id,
      isCrossDepartment: true,
      status: 'NOT_STARTED' as const,
      estimatedHours: 4,
      dueDate: futureDate,
      projectId: projects['FIN'].id,
      milestoneId: milestone1.id,
    },
    // Documentation & Records
    {
      title: 'Drawing Upload - As-Built',
      description: 'Upload as-built drawings to document management system.',
      priority: 'MEDIUM' as const,
      type: 'TASK' as const,
      categoryId: categories['DOC-DWG']?.id,
      departmentId: depts['DOC'].id,
      originDepartmentId: depts['DOC'].id,
      assigneeId: hrMember.id,
      creatorId: hrManager.id,
      isCrossDepartment: true,
      status: 'NOT_STARTED' as const,
      estimatedHours: 3,
      dueDate: upcomingDate,
      projectId: projects['DOC'].id,
      milestoneId: milestone1.id,
    },
    // HR & Admin
    {
      title: 'Leave Policy Update',
      description: 'Update company leave policy for new fiscal year.',
      priority: 'MEDIUM' as const,
      type: 'TASK' as const,
      categoryId: categories['HR-ATT']?.id,
      departmentId: hrDept.id,
      originDepartmentId: hrDept.id,
      assigneeId: hrManager.id,
      creatorId: hrManager.id,
      isCrossDepartment: false,
      status: 'IN_PROGRESS' as const,
      estimatedHours: 6,
      dueDate: futureDate,
      projectId: projects['HR'].id,
      milestoneId: milestone2.id,
    },
  ];

  for (const t of moreTasksData) {
    const task = await prisma.task.create({
      data: {
        title: t.title,
        description: t.description,
        assigneeId: t.assigneeId,
        creatorId: t.creatorId,
        departmentId: t.departmentId,
        originDepartmentId: t.originDepartmentId,
        categoryId: t.categoryId,
        projectId: t.projectId,
        milestoneId: t.milestoneId,
        dueDate: t.dueDate,
        status: t.status,
        priority: t.priority,
        type: t.type,
        isCrossDepartment: t.isCrossDepartment,
        estimatedHours: t.estimatedHours,
        percentComplete: t.percentComplete ?? 0,
        blockedReason: t.blockedReason ?? null,
        taskNumber: 1000 + Object.keys(createdTasks).length + moreTasksData.indexOf(t),
      },
    });
    createdTasks[t.title] = task;
    console.log(`  ✅ Task: ${task.title} (TSK-${task.taskNumber})`);
  }

  // Create alerts for each department
  const alertData = [
    {
      title: 'License Expiry - Construction Equipment',
      description: 'Construction equipment operating license expires in 90 days.',
      type: 'LICENSE_RENEWAL' as const,
      priority: 'HIGH' as const,
      ownerId: constructionManager.id,
      departmentId: constructionDept.id,
      triggerDate: new Date(Date.now() + 30 * 86400000),
      dueDate: new Date(Date.now() + 90 * 86400000),
      recurrence: 'ANNUAL' as const,
      reminderDays: [90, 60, 30],
      regulatoryClause: 'Equipment Safety Act 2020',
    },
    {
      title: 'Contract Renewal - Legal Vendor',
      description: 'Legal vendor contract needs renewal.',
      type: 'CONTRACT_RENEWAL' as const,
      priority: 'MEDIUM' as const,
      ownerId: legalManager.id,
      departmentId: legalDept.id,
      triggerDate: new Date(Date.now() + 15 * 86400000),
      dueDate: new Date(Date.now() + 45 * 86400000),
      recurrence: 'ANNUAL' as const,
      reminderDays: [60, 30],
    },
    {
      title: 'Statutory Filing - Annual Return',
      description: 'Annual return filing with registrar of companies.',
      type: 'REGULATORY' as const,
      priority: 'URGENT' as const,
      ownerId: managerCompliance.id,
      departmentId: complianceDept.id,
      triggerDate: new Date(Date.now() + 7 * 86400000),
      dueDate: new Date(Date.now() + 30 * 86400000),
      recurrence: 'ANNUAL' as const,
      reminderDays: [90, 60, 30],
      regulatoryClause: 'Companies Act Section 92',
    },
    {
      title: 'NOC Renewal - Site Operations',
      description: 'Site operations NOC renewal deadline approaching.',
      type: 'REGULATORY' as const,
      priority: 'HIGH' as const,
      ownerId: managerLiaisoning.id,
      departmentId: liaisoningDept.id,
      triggerDate: new Date(Date.now() + 10 * 86400000),
      dueDate: new Date(Date.now() + 60 * 86400000),
      recurrence: 'QUARTERLY' as const,
      reminderDays: [60, 30],
      regulatoryClause: 'Municipal Bye-laws',
    },
  ];

  for (const a of alertData) {
    const alert = await prisma.alert.create({
      data: {
        title: a.title,
        description: a.description,
        type: a.type,
        priority: a.priority,
        ownerId: a.ownerId,
        departmentId: a.departmentId,
        triggerDate: a.triggerDate,
        dueDate: a.dueDate,
        recurrence: a.recurrence,
        reminderDays: a.reminderDays,
        regulatoryClause: a.regulatoryClause ?? null,
        status: 'OPEN',
        createdById: a.ownerId,
      },
    });
    console.log(`  ✅ Alert: ${alert.title}`);
  }

  // Create notifications for managers
  const notifData = [
    { userId: constructionManager.id, type: 'TASK_ASSIGNED', title: 'New Task Assigned', message: 'You have been assigned to Construction Task - Site Inspection', metadata: { taskId: createdTasks['Construction Task - Site Inspection']?.id } },
    { userId: legalManager.id, type: 'TASK_ASSIGNED', title: 'New Task Assigned', message: 'You have been assigned to Legal Task - Contract Review', metadata: { taskId: createdTasks['Legal Task - Contract Review']?.id } },
    { userId: managerLiaisoning.id, type: 'TASK_VERIFICATION', title: 'Task Pending Verification', message: 'Pending Verification Task is awaiting your verification', metadata: { taskId: createdTasks['Pending Verification Task']?.id } },
    { userId: hrManager.id, type: 'REGISTRATION_REQUEST', title: 'New Registration Request', message: 'A new registration request is pending approval', metadata: {} },
  ];

  for (const n of notifData) {
    await prisma.notification.create({
      data: {
        userId: n.userId,
        type: n.type,
        title: n.title,
        message: n.message,
        metadata: n.metadata,
        read: false,
      },
    });
    console.log(`  ✅ Notification: ${n.title} for ${n.userId}`);
  }

  console.log('\n🎉 Seeding complete!\n');
  console.log('Demo Credentials:');
  console.log('========================================');
  for (const u of DEMO_USERS) {
    console.log(`${u.email} / ${u.password} (${u.role}${u.departmentId ? ' - ' + depts[u.departmentId as keyof typeof depts]?.name : ''}) [${u.employeeId}]`);
  }
  console.log('========================================\n');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
