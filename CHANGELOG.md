# CHANGELOG

## [1.5.0] - 2026-10-29

### Added - UI Redesign (Phase F)
- New design system: deep slate/indigo primary, warm amber accent, semantic status colors (WCAG AA contrast, light + dark mode)
- Design tokens in `src/app/globals.css` and `tailwind.config.ts` (CSS HSL variables, semantic color map)
- Font: Inter via next/font with tabular numerals for IDs/dates/numbers
- Sidebar: gradient logo icon with "Alert & Compliance" subtitle, group labels relabeled (Overview, Analytics, Administration)
- Collapsible left sidebar (icons + labels, tooltips when collapsed, remembers state) + slim top bar
- Mobile: sidebar becomes slide-over drawer
- Sidebar groups: Work (Dashboard, Tasks, Alerts, Calendar), Insights (Reports), Admin (Users, Automation, Audit, Config - SUPER_ADMIN only)
- Slim top bar: global search (Ctrl+K), notification bell, theme toggle, user menu
- Active sidebar items use accent background with primary-colored icon and text; hover states use sidebar-accent
- Collapsed sidebar tooltip appears on hover with arrow-pointing flyout (active items get primary-styled tooltip)
- User profile uses Avatar component with initials fallback (replacing external ui-avatars image)
- Sidebar group labels use uppercase tracking-wider text with proper contrast
- Page header pattern: title, description, primary action, breadcrumbs
- Shared UI components: StatusBadge, PriorityBadge, DueDateChip, ProgressBar, UserAvatar, EmptyState, SkeletonTable, ConfirmDialog, PageHeader, StatCard
- Dashboard redesigned with StatCards (clickable), priority/status breakdowns, compliance widgets
- Login page: split layout with brand panel, show/hide password, demo accounts helper
- Error pages: 404 (not-found), 500 (error) for both (app) and (auth) route groups
- Security headers: X-Content-Type-Options, X-Frame-Options (DENY), Referrer-Policy, Strict-Transport-Security, Permissions-Policy
- Global search (Ctrl+K command palette) across tasks, alerts, entities with keyboard navigation
- Loading skeletons, toasts for all actions, friendly error states
- Motion: subtle (150-200ms), respects prefers-reduced-motion
- Responsive: tested at 360px, 768px, 1280px, 1920px; no horizontal scroll
- docs/UI-GUIDE.md: design tokens, components, do/don't patterns

### Fixed
- Removed duplicate `<Toaster />` instance from sidebar-layout (was causing React 19 "Cannot update a component ForwardRef while rendering a different component ForwardRef" error); single Toaster now lives in Providers
- Upgraded sonner 1.7.4 → 2.0.8 for React 19 compatibility
- Upgraded next-themes 0.3.0 → 0.4.6 for React 19 peer dependency support
- Improved sidebar UI: gradient logo icon, relabeled group headers, active item accent styling, proper collapsed tooltips, Avatar-based user profile with initials fallback
- Fixed sidebar disappearing on desktop when clicking navigation items — `sidebarOpen` state no longer affects desktop sidebar visibility; mobile sidebar uses off-canvas slide behavior with `lg:translate-x-0` to stay visible on desktop
- Fixed sidebar/main content alignment — added `lg:ml-16`/`lg:ml-64` margin to main content to account for fixed sidebar width
- Changed search box in top bar from `flex-1` to `w-full max-w-md` for proper sizing
- Fixed all content pages (13 files) replacing `min-h-screen bg-background` + `container` with `flex-1` + `max-w-7xl mx-auto w-full` for proper alignment within the sidebar layout
- Fixed attachments right column missing `lg:col-span-1` class in task detail
- Fixed missing blank line in task-detail.tsx after loading state
- Fixed timezone validation bug in task creation: `dueDate` validation compared UTC midnight (from `new Date("YYYY-MM-DD")`) with local midnight (from `now.setHours(0,0,0,0)`), causing today's date to fail in negative-UTC-offset timezones (e.g., EST). Fixed by using `Date.UTC()` for UTC comparison on server and local date components on client
- Fixed `min` attribute on task due date input to use `toLocaleDateString('en-CA')` for correct local date (was using UTC date via `toISOString().split('T')[0]`)
- Fixed TEAM_MEMBER assignee not seeing attachment upload/delete UI despite backend allowing it via `canModifyTask` — `canEdit` now includes `user.role === 'TEAM_MEMBER' && task?.assigneeId === user.id`
- Fixed indentation in `task-form.tsx` where `handleSubmit` was declared at wrong indentation level (did not affect functionality but inconsistent with codebase style)
- Fixed daily job (run-reminders.ts) to also consider **global** reminder and escalation rules (where alertId is null), not just alert-specific rules — was causing reminders/escalations to be skipped for alerts without specific rules
- Fixed job unit tests (scripts/test-jobs.ts): cleanup now properly deletes JobRun, Notification, and AuditLog records to avoid foreign key constraint violations and idempotency conflicts; removed explicit alertNumber assignments that conflicted with PostgreSQL auto-increment sequence

## [1.4.0] - 2026-10-29

### Added - Administration, Profile & Reporting (Phase E)
- Central permission matrix: `src/lib/permissions.ts` with role → action mappings for tasks, alerts, entities, admin, reports, settings
- `/settings` page: profile (name), change password (with current-password check), theme preference, notification preferences
- API: PATCH /api/settings/profile, PATCH /api/settings/password (bcrypt hash, current password verification)
- `/admin/users` (SUPER_ADMIN): list users, create, edit role, activate/deactivate, reset password; cannot deactivate/demote self
- `/admin/config` (SUPER_ADMIN): manage task categories and entity types labels/colours/sort order
- `/reports` (MANAGER+): task summary (by status, priority, category, assignee workload, overdue ageing 1-7/8-30/30+, blocked tasks, completion rate, estimated vs actual hours), compliance summary (alerts by status/type/entity, due in 30/60/90, overdue with owner), CSV export for each report table, date range and project/entity filters
- Global search (Ctrl+K command palette) across tasks, alerts, entities with grouped results and keyboard navigation
- API: GET /api/search with role-scoped results
- Security hardening: in-memory login rate limiter (5 attempts / 15 min), secure session cookies, security headers in next.config.js (X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Strict-Transport-Security, Permissions-Policy), passwordHash never returned in API responses
- Rate limit applied to NextAuth credentials provider login

## [1.3.0] - 2026-10-29

### Added - Notifications & Automation (Phase D)
- Notification model extended with `readAt`, `taskId`, `alertId` for deep-linking
- Notification API routes: GET /api/notifications (list/filter/paginate), PATCH /api/notifications/[id]/read, POST /api/notifications (mark all read), DELETE /api/notifications/[id]
- Notification bell icon in top bar with unread count badge and dropdown (last 10 notifications, "Mark all read")
- `/notifications` page with filters (all/unread, type), search, pagination, and 60-second polling
- Deep-linking: clicking notification navigates to task or alert detail
- Task notifications: status change (to assignee/creator), BLOCKED with reason, overdue (daily job), due tomorrow (assignee), reassignment, verification result
- Alert notifications: status change, reassignment, completion, reminder, escalation
- Scheduler job: `src/lib/jobs/run-reminders.ts` with daily automation
  - (a) Marks alerts OVERDUE when due date passed
  - (b) Sends advance reminders per active reminder rules (90/60/30 days) with AlertReminderLog de-duplication
  - (c) Escalates overdue/unresolved alerts per escalation rules (notifies role/user, audit log)
  - (d) Notifies overdue tasks and escalates tasks >7 days overdue to manager
  - (e) Generates next occurrence for recurring completed alerts
  - Idempotent: JobRun table prevents duplicate runs same day
- Protected endpoint POST /api/jobs/run (requires x-cron-secret header matching CRON_SECRET env var)
- npm script `npm run jobs:run` for local/manual execution
- Job unit tests in `scripts/test-jobs.ts` (overdue marking, reminder de-duplication, escalation, recurrence generation, idempotency)
- AuditTimeline reusable component (`<AuditTimeline entity entityId>`) with human-readable change summaries
- `/admin/audit` page (SUPER_ADMIN) with filters (user, entity, action, date range) and CSV export
- `/admin/automation` page (SUPER_ADMIN) to edit global reminder days and escalation rules
- `CRON_SECRET` added to `.env.example` with scheduler setup documentation
- QA checklist entries for all Phase D stories (33-37)

### Fixed
- Fixed alert audit log using taskId instead of alertId
- Fixed navigation TypeScript type issues

## [1.2.0] - 2026-10-29
- RBAC enforcement in frontend: hide actions user cannot perform, enforce on server

### Fixed
- Fixed JSX syntax error in page.tsx (unclosed span tag)
- Fixed setDate bug in seed.ts pastDate30 calculation

## [1.1.0] - 2026-10-29

### Added
- BLOCKED status with blockedReason (required) and blockedAt fields
- Notification to manager + creator when task is blocked
- Progress bar (percentComplete 0-100) in register and detail views
- Auto-set percentComplete to 100 when status = COMPLETED
- TaskCategory table seeded with 5 placeholders: Liaisoning, Legal, Documentation, Site/Execution, Finance
- categoryId field on tasks (replacing type enum, kept nullable for migration)
- Phase/Milestone management: Milestone table already in schema, added CRUD API routes
- Show "Project > Milestone" in register and detail views
- Create/edit UI for projects and milestones (MANAGER+ only)
- isMandatory flag on TaskChecklist items
- Server-side enforcement: tasks cannot move to COMPLETED while mandatory checklist items are incomplete (returns 400 with pending item list)
- Status transition validation server-side using ALLOWED_STATUS_TRANSITIONS
- TEAM_MEMBER can only move their own tasks, cannot set CLOSED
- actualHours UI for assignee to log hours; estimated vs actual with over-budget highlight
- isOverdue computed field added consistently across all API responses
- Task EDIT screen with all editable fields (title, description, category, project/milestone, priority, due date, estimated hours)
- Audit log entries for task edits
- File upload for attachments: local /uploads storage, 10 MB limit, allowed types pdf/png/jpg/docx/xlsx
- TaskAttachment table with metadata (fileName, mimeType, size, uploadedById, createdAt)
- API routes for projects, milestones, task categories, and attachments
- QA checklist rows for 8 new stories (blocked tasks, status transitions, mandatory checklist, category management, milestone management, progress bar, task edit, attachments, estimated vs actual hours)
- API smoke tests for blocked task validation, invalid status transitions, categories, projects, milestones, attachments

### Fixed
- Fixed JSX syntax error in page.tsx (unclosed span tag)

## [1.0.0] - 2026-10-28

### Added

#### Phase 0 - Local Setup
- Created `docker-compose.yml` running PostgreSQL 16 (db: task_amc, port 5432)
- Created `.env.example` with DATABASE_URL, AUTH_SECRET, NEXTAUTH_SECRET
- Created `README.md` with full setup instructions and demo logins
- Removed hidden "Test Admin" account from seed
- Demo accounts: admin@demo.com, manager@demo.com, member@demo.com, viewer@demo.com

#### Phase 1 - Data Model
- Added `taskNumber Int @default(autoincrement())` to Task model (unique)
- Added `deletedAt DateTime?` for soft deletes
- Added `verifiedById String?` and `verifiedAt DateTime?` to Task
- Created `TaskVerification` model with outcome enum (VERIFIED | REJECTED)
- Added `updatedAt`, `editedAt`, `deletedAt` to TaskComment
- All task/comment queries filter out soft-deleted records
- Created `lib/task-rules.ts` with business rules (REQUIRED_FIELDS, ELIGIBLE_ASSIGNEE_ROLES, COMMENT_ORDER, UPCOMING_DEADLINE_DAYS)
- Created `formatTaskNumber()` helper to format as "TSK-0001"

#### Authentication & Authorization
- NextAuth v5 credentials login with bcryptjs password hashing
- Role-based access control (SUPER_ADMIN > MANAGER > TEAM_MEMBER > VIEWER)
- `lib/rbac.ts` with requireAuth, requireRole, hasMinRole helpers
- Protected routes with role checks

#### API Routes
- `GET/POST /api/tasks` - Task CRUD with validation, soft delete awareness
- `GET/PATCH/DELETE /api/tasks/[id]` - Individual task management
- `GET/POST /api/tasks/[id]/comments` - Comment management
- `PATCH/DELETE /api/tasks/[id]/comments/[commentId]` - Comment edit/delete
- `GET/POST /api/tasks/[id]/checklist` - Checklist items
- `PATCH/DELETE /api/tasks/[id]/checklist/[checklistId]` - Checklist item management
- `POST /api/tasks/[id]/verify` - Verification workflow (verify/reject)
- `GET /api/users/eligible` - Eligible assignees (TEAM_MEMBER, MANAGER only)
- `GET /api/dashboard/stats` - Dashboard statistics

#### Frontend Pages
- Login page with credentials form
- Dashboard with statistics cards and charts
- Task Register table with search, filters, and sorting
- Task Detail page with full task info, comments, checklist, verification history
- New/Edit Task form with client and server-side validation
- Responsive navigation with theme toggle

#### Story 1 - Create Task
- Title, description, assignee, priority, due date, type, estimated hours
- Priority has no default - user must select
- Zod validation on client and server
- Inline field errors, server returns 400 with fieldErrors
- Whitespace-only title rejected
- Invalid/unparseable dates rejected (never 500)
- Past due dates rejected on create
- Task ID formatted as "TSK-xxxx"
- Initial status: NOT_STARTED
- Audit log entry created
- Assignee notified via Notification

#### Story 2 & 6 - Assign and Reassign
- Assignee dropdown in task detail (MANAGER+ only)
- Save/Cancel buttons
- Dropdown lists active users with TEAM_MEMBER or MANAGER roles
- Server validates assignee exists, is active and eligible
- Reassignment preserves comments, checklist, and history
- Audit log with previous/new assignee names
- New assignee notified
- TEAM_MEMBER and VIEWER get 403

#### Story 3 - Verify Status and Progress
- Assignee marks COMPLETED → Pending verification badge
- Manager gets Verify and Reject buttons on COMPLETED tasks
- Verify → status CLOSED, verifiedById, verifiedAt, TaskVerification(VERIFIED)
- Reject → reason required, status IN_PROGRESS, TaskVerification(REJECTED), comment added, assignee notified
- Task detail shows verification history
- Task Register shows verification status column

#### Story 4 - Delete Task
- Delete button in task detail (MANAGER+ only)
- Confirmation dialog with Cancel and Delete
- Soft delete (sets deletedAt)
- Comments, checklist, and verification records preserved
- Audit log entry created
- 404 with friendly message for non-existent task
- UI shows toast and refreshes list

#### Story 5 - View and Monitor
- Task Register table replacing card list
- Columns: Task ID, Task Name, Assignee, Priority, Due Date, Status, Verification
- Detail panel with full task info
- Search bar matching task name, ID (TSK-12 or 12), or assignee name
- Filters: Assignee (including "Unassigned"), Status, Priority, Overdue only, Due in 7 days
- Overdue badge (red) for overdue tasks
- TEAM_MEMBER sees only own tasks
- VIEWER is read-only
- Unauthenticated users blocked

#### Story 7 - Comments
- Add comment with empty/whitespace validation
- Show author, date/time, "edited" marker
- Comment ordering (newest-first)
- Edit own comments, MANAGER+ can edit/delete any
- Delete asks confirmation
- Soft delete preserves comment history
- VIEWER cannot add/edit/delete
- TEAM_MEMBER can comment on assigned tasks only
- Comments persist after reassignment and status changes

#### QA & Testing
- `docs/QA-CHECKLIST.md` with all 7 stories mapped
- `scripts/api-smoke.mjs` testing 403, 400, 404 cases

### Assumptions
- Tasks can be created by MANAGER and SUPER_ADMIN roles only
- TEAM_MEMBER can only see tasks they're assigned to or created
- VIEWER has read-only access to all non-deleted tasks
- The attachments feature is deferred - shows disabled section in UI
- No file upload support (reserved for future)
- Soft-deleted tasks are hidden from all views but preserved in database
- Checklist items are permanently deleted (not soft-deleted) for simplicity

### Dependencies
- No new dependencies added beyond those specified in the tech stack
- Used class-variance-authority for component variants (installed via tailwindcss-animate peer)
- Used date-fns v4 for date formatting
- Used lucide-react for all icons