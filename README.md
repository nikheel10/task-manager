# TaskAMC - Task, Project & AMC/Compliance Alert Management

A Next.js 16 application for managing tasks, projects, and compliance alerts with role-based access control.

## Tech Stack

- **Framework**: Next.js 16 (App Router), React 19, TypeScript 5.6
- **Database**: PostgreSQL 16 with Prisma 6.7 ORM
- **Authentication**: NextAuth v5 (credentials provider)
- **Styling**: Tailwind CSS 3.4 + shadcn/ui (Radix UI)
- **State Management**: React useState + useEffect (no external libraries)
- **Validation**: Zod 3.23 (shared client/server)
- **Notifications**: Sonner toasts
- **Charts**: Recharts / Chart.js / Plotly.js

## Roles (Hierarchy)

1. **SUPER_ADMIN** - Full system access
2. **MANAGER** - Create/assign/verify/delete tasks, manage team
3. **TEAM_MEMBER** - View assigned tasks, update progress, add comments
4. **VIEWER** - Read-only access

### Permission Matrix

Centralized in `src/lib/permissions.ts`:

| Action | SUPER_ADMIN | MANAGER | TEAM_MEMBER | VIEWER |
|--------|-------------|---------|-------------|--------|
| tasks.view | ✅ | ✅ | ✅ | ✅ |
| tasks.create | ✅ | ✅ | ❌ | ❌ |
| tasks.edit | ✅ | ✅ | own only | ❌ |
| tasks.delete | ✅ | ✅ | ❌ | ❌ |
| tasks.reassign | ✅ | ✅ | ❌ | ❌ |
| tasks.verify | ✅ | ✅ | ❌ | ❌ |
| tasks.comment | ✅ | ✅ | own only | ❌ |
| tasks.attach | ✅ | ✅ | own only | ❌ |
| tasks.status_change | ✅ | ✅ | own only | ❌ |
| alerts.view | ✅ | ✅ | ✅ | ✅ |
| alerts.create | ✅ | ✅ | ❌ | ❌ |
| alerts.edit | ✅ | ✅ | ❌ | ❌ |
| alerts.delete | ✅ | ✅ | ❌ | ❌ |
| alerts.complete | ✅ | ✅ | own only | ❌ |
| alerts.reassign | ✅ | ✅ | ❌ | ❌ |
| alerts.comment | ✅ | ✅ | own only | ❌ |
| alerts.evidence | ✅ | ✅ | own only | ❌ |
| alerts.status_change | ✅ | ✅ | own only | ❌ |
| entities.view | ✅ | ✅ | ✅ | ✅ |
| entities.create | ✅ | ✅ | ❌ | ❌ |
| entities.edit | ✅ | ✅ | ❌ | ❌ |
| entities.delete | ✅ | ✅ | ❌ | ❌ |
| admin.users | ✅ | ❌ | ❌ | ❌ |
| admin.config | ✅ | ❌ | ❌ | ❌ |
| admin.audit | ✅ | ❌ | ❌ | ❌ |
| admin.automation | ✅ | ❌ | ❌ | ❌ |
| reports.view | ✅ | ✅ | ❌ | ❌ |
| settings.view | ✅ | ✅ | ✅ | ✅ |
| settings.edit_profile | ✅ | ✅ | ✅ | ✅ |
| settings.change_password | ✅ | ✅ | ✅ | ✅ |

`ownOnly` means the user must be the owner/assignee/creator of the resource.

## Quick Start

### Prerequisites
- Node.js >= 20.9.0
- npm (not yarn)
- Docker (for PostgreSQL)

### Setup Steps

```bash
# 1. Start PostgreSQL database
docker compose up -d

# 2. Install dependencies
npm install

# 3. Generate Prisma client
npx prisma generate

# 4. Push database schema
npx prisma db push

# 5. Seed demo data
npx prisma db seed

# 6. Start development server
npm run dev
```

The app will be available at **http://localhost:3000**

### Demo Accounts

| Role | Email | Password |
|------|-------|----------|
| SUPER_ADMIN | admin@demo.com | Admin@123 |
| MANAGER | manager@demo.com | Manager@123 |
| TEAM_MEMBER | member@demo.com | Member@123 |
| VIEWER | viewer@demo.com | Viewer@123 |

## Project Structure

```
src/
├── app/
│   ├── (auth)/           # Auth pages (login)
│   ├── (app)/            # Protected app pages
│   │   ├── dashboard/    # Dashboard with charts
│   │   └── tasks/        # Task register & detail
│   └── api/              # API routes
│       ├── auth/         # NextAuth endpoints
│       └── tasks/        # Task CRUD, comments, checklist
├── components/
│   └── ui/               # shadcn/ui components
├── lib/
│   ├── auth.ts           # NextAuth config
│   ├── prisma.ts         # Prisma client singleton
│   ├── rbac.ts           # Role-based access control
│   ├── audit.ts          # Audit logging
│   ├── notifications.ts  # Notification system
│   ├── validators/       # Zod schemas
│   ├── task-rules.ts     # Business rules constants
│   └── utils.ts          # Utility functions
└── scripts/              # Seed & smoke tests
```

## Available Scripts

```bash
npm run dev          # Start dev server
npm run build        # Production build
npm run start        # Start production server
npm run lint         # Run ESLint
npm run typecheck    # Run TypeScript check
npm run db:generate  # Generate Prisma client
npm run db:push      # Push schema to database
npm run db:seed      # Seed database
npm run db:studio    # Open Prisma Studio
npm run test:api     # Run API smoke tests
```

## Features

### Task Management
- Create tasks with validation (title, assignee, priority, due date required)
- Task IDs displayed as `TSK-0001` (zero-padded)
- Priority selection required (no default)
- Due date validation (no past dates on create)

### Task Register
- Table view with: Task ID, Name, Assignee, Priority, Due Date, Status, Overdue flag
- Search by task name, ID (accepts "TSK-12" or "12"), or assignee name
- Filters: Assignee, Status, Priority, Overdue only, Due in 7 days
- Role-based visibility (members see only own tasks)

### Task Detail
- Full task info: description, assignee, priority, due date, status
- Comments with edit/delete (soft delete), author attribution, "edited" marker
- Checklist with completion tracking
- Verification history (for managers)
- Attachments section (disabled - coming soon)

### Assignment & Reassignment
- Manager+ can assign/reassign via dropdown (eligible roles only)
- Audit log with previous/new assignee
- Notifications to new assignee

### Verification Workflow
- Assignee marks COMPLETED → "Pending verification" badge
- Manager verifies (CLOSED) or rejects (IN_PROGRESS + reason)
- Verification records stored with outcome, reason, verifier, timestamp

### Soft Delete
- Manager+ can delete with confirmation dialog
- Sets `deletedAt` - hides from registers but preserves history
- Audit log entry created

### Comments
- Add/edit/delete with permissions
- Viewers: read-only
- Members: comment on assigned tasks only
- Managers: edit/delete any comment
- Soft delete preserves history

### Audit & Notifications
- All mutations create audit log entries
- Real-time notifications for assignments, verifications, comments, status changes
- Notification bell icon with unread count badge in top bar
- `/notifications` page with filters and polling

### Scheduler / Daily Automation Job

A daily job automates alert/task maintenance:

**API endpoint**: `POST /api/jobs/run` (requires `x-cron-secret` header matching `CRON_SECRET`)
**CLI script**: `npm run jobs:run`

The daily job performs:
1. Marks alerts OVERDUE when due date passed and not completed/cancelled
2. Sends advance reminders per active reminder rules (90/60/30 days default) - deduplicated via AlertReminderLog
3. Escalates overdue/unresolved alerts per escalation rules (notifies role/user, audit logs)
4. Notifies overdue tasks; escalates tasks >7 days overdue to manager
5. Sends "due tomorrow" reminders to task assignees
6. Generates next occurrence for recurring completed alerts

**Scheduling (cron)**:
```bash
# Run daily at 06:00 UTC - add to crontab:
0 6 * * * curl -X POST http://localhost:3000/api/jobs/run -H "x-cron-secret: YOUR_CRON_SECRET"
```

**Windows Task Scheduler**:
- Program: `curl.exe` (or PowerShell `Invoke-RestMethod`)
- Arguments: `-X POST http://localhost:3000/api/jobs/run -H "x-cron-secret: YOUR_CRON_SECRET"`
- Trigger: Daily at 06:00

**Job idempotency**: Running the same job twice on the same day sends nothing twice (tracked via `JobRun` table).

**Unit tests**: `npm run test:jobs` (overdue marking, reminder de-duplication, escalation, recurrence generation, idempotency)

## Development

### Database Changes
```bash
# Edit prisma/schema.prisma then:
npx prisma db push
npx prisma generate
```

### Code Quality
```bash
npm run lint
npm run typecheck
```

Both must pass before committing.

## Environment Variables

| Variable | Description |
|----------|-------------|
| DATABASE_URL | PostgreSQL connection string |
| AUTH_SECRET | NextAuth secret (min 32 chars) |
| NEXTAUTH_SECRET | Same as AUTH_SECRET |
| NEXT_PUBLIC_APP_URL | App URL for emails/redirects |
| CRON_SECRET | Secret for securing POST /api/jobs/run endpoint |
| SMTP_HOST | Optional: SMTP host for email notifications |
| SMTP_PORT | Optional: SMTP port (default 587) |
| SMTP_USER | Optional: SMTP username |
| SMTP_PASS | Optional: SMTP password |
| EMAIL_FROM | Optional: From address for emails |

Copy `.env.example` to `.env` and update values.

## Security

- **Login rate limiting**: Maximum 5 failed attempts per 15-minute window per email address
- **Session cookies**: Secure, HttpOnly, SameSite=Strict
- **Security headers**: X-Content-Type-Options, X-Frame-Options (DENY), Referrer-Policy, Strict-Transport-Security, Permissions-Policy
- **No passwordHash leakage**: User API responses never include passwordHash
- **Environment variables**: Never commit `.env` to version control; use `.env.example` only
- **Cross-user data isolation**: All API routes enforce ownership checks; users can only access their own data unless they have MANAGER+/SUPER_ADMIN roles

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for the full guide.

- **Branch**: `git checkout -b feature/my-feature-name` (never push directly to `main`)
- **Commit**: Write clear, descriptive commit messages
- **Push**: `git push origin feature/my-feature-name`
- **PR**: Open a Pull Request; wait for review + CI checks to pass

## Pull Request Template

A [PR template](.github/pull_request_template.md) is included — fill it out when opening a PR.

## License

Internal use only.