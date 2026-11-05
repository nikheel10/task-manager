# UI Guide - TaskAMC

This document describes the design system, components, and patterns used in TaskAMC Phase F.

## Design Tokens

### Color Palette

TaskAMC uses a restrained, professional palette based on deep slate/indigo with a warm amber accent. All colors are defined as CSS HSL variables in `src/app/globals.css`.

#### Base Colors

| Token | Light | Dark | Description |
|-------|-------|------|-------------|
| `--primary` | 224 71.4% 41.4% | 224 71.4% 51.4% | Primary brand color (slate-indigo) |
| `--accent` | 36 84.2% 60.2% | 36 84.2% 60.2% | Warm accent (amber) |
| `--destructive` | 0 84.2% 60.2% | 0 62.8% 30.6% | Errors, deletions, overdue |
| `--muted-foreground` | 215.4 16.3% 46.9% | 215 20.2% 65.1% | Secondary text |
| `--border` | 214.3 31.8% 91.4% | 217.2 32.6% 17.5% | Borders, dividers |

#### Semantic Status Colors

| Status | Color | Usage |
|--------|-------|-------|
| Not Started | Neutral grey | Tasks not yet begun |
| In Progress | Primary (slate-indigo) | Active tasks |
| Blocked | Destructive (red) | Tasks with blockers |
| Completed | Teal/Green | Finished tasks |
| Closed/Verified | Green | Verified and closed |
| Overdue | Destructive (red) | Past due date |
| Due Soon | Amber | Due within 3-7 days |

### Typography

- **UI Font**: Inter (sans-serif) - used for all interface text
- **Tabular numerals**: Used for IDs, dates, and numbers
- **Font weights**: 400 (regular), 500 (medium), 600 (semibold), 700 (bold)

### Spacing

Consistent spacing scale using Tailwind's default scale (0.25rem increments). Standard component padding: `p-4` (1rem), `p-6` (1.5rem). Section gaps: `gap-4` (1rem), `gap-6` (1.5rem).

### Border Radius

- `sm`: 0.375rem
- `md`: 0.5rem
- `lg`: 0.6rem

## Layout

### Sidebar Layout

The app uses a collapsible left sidebar (`SidebarLayout`) with:

- **Collapsed state**: 4rem wide (icons only, tooltips on hover)
- **Expanded state**: 16rem wide (icons + labels)
- **Mobile**: Slide-over drawer (overlays content)
- **State persistence**: Remembers collapsed/expanded across sessions
- **Groups**: Work (Dashboard, Tasks, Alerts, Calendar), Insights (Reports), Admin (Users, Automation, Audit, Config - SUPER_ADMIN only)

### Top Bar

Slim top bar (56px) containing:
- Sidebar toggle (mobile only)
- Global search (Ctrl+K)
- Theme toggle
- Notification bell with unread badge
- User avatar / menu

### Page Header Pattern

```
[Title]                    [Primary Action]
[Description]              [Breadcrumbs on detail pages]
```

Use the `PageHeader` component for consistent page headers.

## Components

### StatusBadge

Displays task status with appropriate color coding.

```tsx
<StatusBadge status="IN_PROGRESS" />
<StatusBadge status="OVERDUE" />
<StatusBadge status="COMPLETED" />
```

### PriorityBadge

Displays task priority.

```tsx
<PriorityBadge priority="HIGH" />
<PriorityBadge priority="URGENT" />
```

### DueDateChip

Shows relative due date with color coding:
- Overdue: Red ("5 days overdue")
- Due today: Red ("Due today")
- Due in 1-3 days: Red ("Due in 3 days")
- Due in 4-7 days: Amber ("Due in 5 days")
- Due in 8-30 days: Secondary ("Due in 15 days")
- Future: Outline ("Due in 45 days")

```tsx
<DueDateChip dueDate="2025-12-01" />
```

### ProgressBar

Displays progress percentage with optional label.

```tsx
<ProgressBar value={65} max={100} showLabel />
```

### UserAvatar

Shows user initials in a circular avatar.

```tsx
<UserAvatar user={{ id, name, email }} size="md" />
```

### EmptyState

Displays empty state with icon, title, description, and optional action.

```tsx
<EmptyState
  title="No tasks found"
  description="No tasks match your filters"
  icon="noTasks"
  action={<Button>Create Task</Button>}
/>
```

### StatCard

Displays a key metric with optional trend and icon. Clickable when `href` is provided.

```tsx
<StatCard
  title="Overdue Tasks"
  value={12}
  icon={<AlertTriangle className="h-5 w-5" />}
  trend={{ value: 5, label: "increase from last week", positive: false }}
  href="/tasks?overdueOnly=true"
/>
```

### ConfirmDialog

Confirmation dialog for destructive actions.

```tsx
<ConfirmDialog
  open={isOpen}
  onOpenChange={setOpen}
  title="Delete Task"
  description="Are you sure you want to delete this task?"
  onConfirm={handleDelete}
  variant="destructive"
/>
```

### SkeletonTable

Loading skeleton for table data.

```tsx
<SkeletonTable columns={4} rows={5} />
```

## Patterns

### Tables

- Sticky header
- Row hover state
- Density toggle (comfortable/compact) - planned
- Sortable headers - planned
- Column visibility - planned
- Responsive: cards on mobile

### Forms

- Two-column layout
- Inline help text
- Required markers
- Character counters - planned
- Date picker with presets (Today, +7 days) - planned
- Unsaved-changes warning - planned
- Disabled state while saving

### Navigation

- Keyboard shortcut: Ctrl+K opens global search
- Escape closes dialogs/sheets/search
- Active state clearly indicated
- Overdue badge on Alerts/Tasks nav items

### Notifications

- Bell icon in top bar with unread count badge
- Dropdown with last 10 notifications
- "Mark all read" option
- Click to deep-link to task or alert
- Polls every 60 seconds
- Full page at `/notifications` with filters and pagination

### Toasts

Sonner toasts for all success/failure actions:
- Creation: "Task created successfully"
- Update: "Task updated successfully"
- Delete: "Task deleted"
- Error: Descriptive error message

### Accessibility

- ARIA labels on interactive elements
- Focus management in dialogs/sheets
- Full keyboard navigation
- Color not the only indicator (icons + text with status)
- WCAG AA contrast ratios
- Respects `prefers-reduced-motion`

### Responsive Breakpoints

- 360px: Mobile (small phones)
- 768px: Tablet (sidebar becomes drawer)
- 1280px: Desktop (sidebar expanded)
- 1920px: Large desktop

## Do's and Don'ts

### Do
- Use semantic status colors consistently
- Use StatusBadge/PriorityBadge/DueDateChip components instead of ad-hoc badges
- Add loading skeletons for async data
- Show confirmation dialogs for destructive actions
- Use PageHeader for consistent page headers
- Keep forms two-column with inline help
- Test dark mode on every page

### Don't
- Don't use default blue Tailwind colors
- Don't create custom badge styles - use StatusBadge/PriorityBadge
- Don't skip loading states
- Don't rely on color alone for status indication
- Don't hardcode pixel values - use Tailwind spacing scale
- Don't forget mobile responsive design
