# QA Checklist - TaskAMC

## Test Scenarios for All 7 Stories

### Story 1 - Create Task

| # | Scenario | Steps | Expected Result | Pass |
|---|----------|-------|-----------------|------|
| 1.1 | Manager creates a task | 1. Login as manager@demo.com<br>2. Navigate to Tasks → New Task<br>3. Fill all required fields<br>4. Click "Create Task" | Task created with TSK-xxxx ID, status NOT_STARTED, appears in register, audit log entry exists, assignee notified |  |
| 1.2 | Task name whitespace rejected | 1. Login as manager<br>2. Fill title with spaces only<br>3. Leave other fields filled<br>4. Submit | Inline error: "Task name is required", no task created |  |
| 1.3 | Missing required fields | 1. Login as manager<br>2. Fill partial form (missing assignee/priority/due date)<br>3. Submit | Inline field errors for each missing field |  |
| 1.4 | Priority not selected | 1. Login as manager<br>2. Fill all fields except priority<br>3. Submit | Error: "Priority is required" |  |
| 1.5 | Past due date rejected | 1. Login as manager<br>2. Set due date to yesterday<br>3. Submit | Error: "Due date cannot be in the past" |  ✅ |
| 1.5a | Today's date accepted (timezone-safe) | 1. Login as manager in any UTC offset timezone<br>2. Open New Task form<br>3. Set due date to today<br>4. Click Create Task | Task created successfully, no "Due date cannot be in the past" error (verified in UTC+5:30 and UTC-4) |  ✅ |
| 1.5a | Today's date accepted (timezone fix) | 1. Login as manager in any UTC offset timezone<br>2. Open New Task form<br>3. Set due date to today<br>4. Click Create Task | Task created successfully, no "Due date cannot be in the past" error |  |
| 1.6 | Invalid date rejected (not 500) | 1. Login as manager<br>2. Send request with invalid date format<br>3. Submit | Returns 400, not 500 |  |
| 1.7 | Team member cannot create task | 1. Login as member@demo.com<br>2. Navigate to /tasks/new | Redirect or 403, no New Task button visible in register |  |
| 1.8 | Viewer cannot create task | 1. Login as viewer@demo.com<br>2. Navigate to /tasks/new | Redirect or 403 |  |
| 1.9 | Cancel button | 1. Login as manager<br>2. Open New Task form<br>3. Fill some fields<br>4. Click Cancel | Form closes, no task created, returned to register |  |
| 1.10 | Cancel via API | 1. Open create form<br>2. Click Cancel without submitting | No API call, no task created |  |

### Story 2 & 6 - Assign and Reassign

| # | Scenario | Steps | Expected Result | Pass |
|---|----------|-------|-----------------|------|
| 2.1 | Manager assigns task on create | 1. Login as manager<br>2. Create task with assignee | Assignee set, notification sent to assignee |  |
| 2.2 | Manager reassigns task | 1. Login as manager<br>2. Open task detail<br>3. Change assignee from dropdown<br>4. Click Save | Task reassigned, old comments preserved, notification sent to new assignee, audit log updated |  |
| 2.3 | Cancel reassignment | 1. Login as manager<br>2. Open task detail<br>3. Change assignee<br>4. Click Cancel | Original assignee unchanged |  |
| 2.4 | Assignee dropdown shows eligible roles only | 1. Login as manager<br>2. Open task detail<br>3. Open assignee dropdown | Only TEAM_MEMBER and MANAGER users shown, not VIEWER or SUPER_ADMIN |  |
| 2.5 | Server validates assignee | 1. Send PATCH with invalid assigneeId | Returns 400 with clear message |  |
| 2.6 | Server rejects inactive assignee | 1. PATCH task to inactive user | Returns 400 with "Assignee not found or inactive" |  |
| 2.7 | Server rejects ineligible role | 1. PATCH task to VIEWER user | Returns 400 with "Assignee must be a Team Member or Manager" |  |
| 2.8 | Reassignment preserves history | 1. Reassign task<br>2. Check comments, checklist, audit log | All preserved, unchanged |  |
| 2.9 | Team member cannot reassign | 1. Login as member<br>2. Attempt to change assignee via API | Returns 403, assignee unchanged |  |
| 2.10 | Viewer cannot reassign | 1. Login as viewer<br>2. Attempt to change assignee | No dropdown visible, API returns 403 |  |
| 2.11 | Audit log contains previous/new assignee | 1. Reassign task<br>2. Check audit log | Log shows "Reassigned from A to B" with date and user |  |
| 2.12 | New assignee notified | 1. Reassign task<br>2. Login as new assignee | Notification visible |  |

### Story 3 - Verify Status and Progress

| # | Scenario | Steps | Expected Result | Pass |
|---|----------|-------|-----------------|------|
| 3.1 | Assignee marks task completed | 1. Login as member<br>2. Open assigned task<br>3. Click "Mark as Completed" | Status changes to COMPLETED, "Pending verification" badge shows for managers |  |
| 3.2 | Manager sees Verify/Reject buttons | 1. Login as manager<br>2. Open COMPLETED task | Verify and Reject buttons visible |  |
| 3.3 | Verify task | 1. Login as manager<br>2. Open COMPLETED task<br>3. Click Verify | Status CLOSED, verifiedById/verifiedAt set, TaskVerification(VERIFIED) created |  |
| 3.4 | Reject task with reason | 1. Login as manager<br>2. Open COMPLETED task<br>3. Click Reject<br>4. Enter reason<br>5. Confirm | Status IN_PROGRESS, TaskVerification(REJECTED) with reason, reason added as comment, assignee notified |  |
| 3.5 | Reject without reason | 1. Login as manager<br>2. Open COMPLETED task<br>3. Click Reject<br>4. Click Confirm without entering reason | Validation error: "Reason is required" |  |
| 3.6 | Team member cannot verify | 1. Login as member<br>2. Attempt to verify task | Returns 403, no status change |  |
| 3.7 | Viewer cannot verify | 1. Login as viewer<br>2. Attempt to verify task | Returns 403 |  |
| 3.8 | Verification shows in register | 1. Complete and verify task<br>2. View Task Register | Verification column shows "Verified" |  |
| 3.9 | Verification history in detail | 1. Complete/verify, then reject/reassign<br>2. Open task detail | Full verification history shown |  |
| 3.10 | Status changes preserved | 1. Verify task<br>2. Check audit log | Audit log entry shows status change and verification outcome |  |

### Story 4 - Delete Task

| # | Scenario | Steps | Expected Result | Pass |
|---|----------|-------|-----------------|------|
| 4.1 | Manager deletes task | 1. Login as manager<br>2. Open task detail<br>3. Click Delete<br>4. Confirm in dialog | Task soft-deleted (deletedAt set), disappears from register, audit log entry |  |
| 4.2 | Cancel delete | 1. Login as manager<br>2. Open task detail<br>3. Click Delete<br>4. Click Cancel | Task unchanged, no deletion |  |
| 4.3 | Delete non-existent task returns 404 | 1. DELETE /api/tasks/nonexistent | Returns 404 with friendly message |  |
| 4.4 | Deleted task hidden from register | 1. Delete task<br>2. Refresh task register | Deleted task not visible |  |
| 4.5 | Deleted task hidden from search | 1. Delete task<br>2. Search for task | Not found |  |
| 4.6 | Deleted task hidden from dashboard counts | 1. Delete task<br>2. Check dashboard | Counts updated |  |
| 4.7 | Comments/checklist/verification preserved | 1. Delete task<br>2. Check database | deletedAt set, related records still in DB |  |
| 4.8 | Team member cannot delete | 1. Login as member<br>2. Attempt DELETE via API | Returns 403, task unchanged |  |
| 4.9 | Viewer cannot delete | 1. Login as viewer<br>2. Attempt DELETE | Returns 403 |  |
| 4.10 | Soft delete in audit log | 1. Delete task<br>2. Check audit log | DELETE action logged with task info |  |

### Story 5 - View and Monitor

| # | Scenario | Steps | Expected Result | Pass |
|---|----------|-------|-----------------|------|
| 5.1 | Task Register table displays | 1. Login and navigate to Tasks | Table shows: Task ID, Name, Assignee, Priority, Due Date, Status, Verification |  |
| 5.2 | Search by task name | 1. Enter partial task name in search<br>2. Press Enter | Only matching tasks shown |  |
| 5.3 | Search by Task ID (TSK- format) | 1. Enter "TSK-0001"<br>2. Search | Matching task shown |  |
| 5.4 | Search by Task number only | 1. Enter "1"<br>2. Search | Matching task shown |  |
| 5.5 | Search by assignee name | 1. Enter assignee name<br>2. Search | Only tasks for that assignee shown |  |
| 5.6 | Clear search restores list | 1. Search<br>2. Clear search field | Full list restored |  |
| 5.7 | Zero results shows message | 1. Search with no matches | "No results found." shown |  |
| 5.8 | Filter by assignee | 1. Open filters<br>2. Select assignee | Only tasks for that assignee shown |  |
| 5.9 | Filter by "Unassigned" | 1. Filter → Assignee → Unassigned | Only unassigned tasks shown |  |
| 5.10 | Filter by status | 1. Open filters<br>2. Select status | Only tasks with that status shown |  |
| 5.11 | Filter by priority | 1. Open filters<br>2. Select priority | Only tasks with that priority shown |  |
| 5.12 | Filter by overdue only | 1. Open filters<br>2. Check "Overdue Only" | Only overdue tasks shown |  |
| 5.13 | Filter by upcoming (7 days) | 1. Open filters<br>2. Check "Upcoming" | Only tasks due within 7 days shown |  |
| 5.14 | Combined filters | 1. Set multiple filters | All filters applied (AND logic) |  |
| 5.15 | Overdue badge shows | 1. View overdue task in register | Red "Overdue" badge visible |  |
| 5.16 | Team member sees only own tasks | 1. Login as member<br>2. Open Task Register | Only assigned tasks visible |  |
| 5.17 | Viewer read-only access | 1. Login as viewer<br>2. Open Task Register | Can view all tasks, no edit buttons |  |
| 5.18 | Unauthenticated blocked | 1. Logout<br>2. Navigate to /tasks | Redirect to /login |  |
| 5.19 | Detail panel shows task info | 1. Click a task | Detail panel shows: name, description, assignee, priority, due date, status, comments, verification history |  |

### Story 7 - Comments

| # | Scenario | Steps | Expected Result | Pass |
|---|----------|-------|-----------------|------|
| 7.1 | Add comment | 1. Login as member<br>2. Open assigned task<br>3. Enter comment text<br>4. Click "Add Comment" | Comment appears with author and timestamp |  |
| 7.2 | Empty comment rejected (UI) | 1. Leave comment field empty<br>2. Click "Add Comment" | Validation error, comment not created |  |
| 7.3 | Whitespace comment rejected (server) | 1. Send comment with only spaces | Returns 400 with validation error |  |
| 7.4 | Comment ordering (newest-first) | 1. Add multiple comments<br>2. Refresh | Comments displayed newest first |  |
| 7.5 | Edited marker | 1. Edit a comment<br>2. View comment | "edited" badge shown |  |
| 7.6 | Author can edit own comment | 1. Login as comment author<br>2. Edit comment | Comment updated |  |
| 7.7 | Manager can edit any comment | 1. Login as manager<br>2. Edit another user's comment | Comment updated |  |
| 7.8 | Team member cannot edit others' comments | 1. Login as member<br>2. Try to edit another user's comment | No edit option visible |  |
| 7.9 | Delete comment (own) | 1. Login as comment author<br>2. Delete comment | Comment soft-deleted, audit log created |  |
| 7.10 | Delete comment (manager) | 1. Login as manager<br>2. Delete any comment | Comment soft-deleted |  |
| 7.11 | Viewer cannot comment | 1. Login as viewer<br>2. Try to add comment | No comment form visible |  |
| 7.12 | Member comments on non-assigned task | 1. Login as member<br>2. Try to comment on task not assigned to them | Returns 403, comment not created |  |
| 7.13 | Comments persist after reassignment | 1. Add comments<br>2. Reassign task<br>3. Check comments | All comments preserved |  |
| 7.14 | Comments persist after status change | 1. Add comments<br>2. Change status<br>3. Check comments | All comments preserved |  |
| 7.15 | Delete 404 for non-existent comment | 1. DELETE non-existent comment ID | Returns 404 |  |

### Cross-Cutting Tests

| # | Scenario | Steps | Expected Result | Pass |
|---|----------|-------|-----------------|------|
| X.1 | Audit log created for create | 1. Create task<br>2. Check audit log | CREATE action logged |  |
| X.2 | Audit log created for update | 1. Update task<br>2. Check audit log | UPDATE action logged |  |
| X.3 | Audit log created for delete | 1. Delete task<br>2. Check audit log | DELETE action logged |  |
| X.4 | Audit log created for comment edit | 1. Edit comment<br>2. Check audit log | UPDATE action logged |  |
| X.5 | Audit log created for comment delete | 1. Delete comment<br>2. Check audit log | DELETE action logged |  |
| X.6 | Notifications sent for assignment | 1. Assign task<br>2. Check notification | Notification created |  |
| X.7 | Notifications sent for verification | 1. Verify/reject task<br>2. Check notification | Assignee notified |  |
| X.8 | No stack traces in error responses | 1. Send invalid request<br>2. Check response | JSON error, no stack trace |  |
| X.9 | All API routes validate with zod | 1. Send unvalidated data<br>2. Check response | 400 with fieldErrors |  |
| X.10 | Light/dark mode works | 1. Toggle theme<br>2. Verify UI changes | Theme persists |  |
| X.11 | Mobile responsive | 1. Resize viewport<br>2. Check layout | Layout adapts to size |  |

### Story 8 - Blocked Tasks

| # | Scenario | Steps | Expected Result | Pass |
|---|----------|-------|-----------------|------|
| 8.1 | Block a task with reason | 1. Login as assignee<br>2. Open task detail<br>3. Change status to BLOCKED<br>4. Enter reason | blockedReason saved, blockedAt set, BLOCKED badge shown |  |
| 8.2 | Block a task without reason | 1. Login as assignee<br>2. Try to set status to BLOCKED without reason | 400 error: "Blocked reason is required" |  |
| 8.3 | Manager notified when task blocked | 1. Task blocked by assignee<br>2. Login as manager | Notification visible: "Task Blocked" |  |
| 8.4 | Creator notified when task blocked | 1. Task blocked by assignee<br>2. Login as creator | Notification visible: "Task Blocked" |  |

### Story 9 - Status Transitions

| # | Scenario | Steps | Expected Result | Pass |
|---|----------|-------|-----------------|------|
| 9.1 | NOT_STARTED -> IN_PROGRESS | 1. Change status from NOT_STARTED<br>2. Set to IN_PROGRESS | Status updated successfully |  |
| 9.2 | NOT_STARTED -> BLOCKED | 1. Change status from NOT_STARTED<br>2. Set to BLOCKED with reason | Status updated to BLOCKED |  |
| 9.3 | IN_PROGRESS -> COMPLETED | 1. Change status from IN_PROGRESS<br>2. Set to COMPLETED | Status updated to COMPLETED, percentComplete=100 |  |
| 9.4 | BLOCKED -> IN_PROGRESS | 1. Change status from BLOCKED<br>2. Set to IN_PROGRESS | Status updated, blockedReason cleared |  |
| 9.5 | COMPLETED -> CLOSED (manager only) | 1. Login as manager<br>2. Verify task | Status CLOSED |  |
| 9.6 | COMPLETED -> IN_PROGRESS (reject) | 1. Login as manager<br>2. Reject task | Status IN_PROGRESS |  |
| 9.7 | Invalid transition rejected | 1. Try NOT_STARTED -> COMPLETED directly | 400: Invalid status transition |  |
| 9.8 | CLOSED is terminal | 1. Try to change status from CLOSED | 400: Invalid status transition |  |
| 9.9 | TEAM_MEMBER cannot set CLOSED | 1. Login as member<br>2. Try to set CLOSED | 403: Forbidden |  |
| 9.10 | TEAM_MEMBER can only modify own tasks | 1. Login as member<br>2. Try to change another member's task status | 403: Forbidden |  |

### Story 10 - Mandatory Checklist Enforcement

| # | Scenario | Steps | Expected Result | Pass |
|---|----------|-------|-----------------|------|
| 10.1 | Complete task with incomplete mandatory items | 1. Open task with mandatory unchecked items<br>2. Try to mark COMPLETED | 400: Lists pending mandatory items |  |
| 10.2 | Complete task with all mandatory items done | 1. Check all mandatory items<br>2. Mark COMPLETED | Status COMPLETED, percentComplete=100 |  |
| 10.3 | Mandatory items shown in checklist UI | 1. View checklist on task detail | Mandatory items have "Mandatory" badge |  |

### Story 11 - Category Management

| # | Scenario | Steps | Expected Result | Pass |
|---|----------|-------|-----------------|------|
| 11.1 | View categories | 1. Navigate to category management | 5 categories shown (Liaisoning, Legal, Documentation, Site/Execution, Finance) |  |
| 11.2 | Manager can create category | 1. Login as manager<br>2. Create new category | Category created, appears in list |  |
| 11.3 | Team member cannot create category | 1. Login as member<br>2. Try to access category CRUD | 403 Forbidden |  |
| 11.4 | Task form shows category dropdown | 1. Create new task<br>2. View category field | Dropdown shows seeded categories |  |

### Story 12 - Milestone Management

| # | Scenario | Steps | Expected Result | Pass |
|---|----------|-------|-----------------|------|
| 12.1 | Create milestone | 1. Login as manager<br>2. Create milestone under project | Milestone created |  |
| 12.2 | Assign milestone to task | 1. Create task<br>2. Select milestone from dropdown | Task linked to milestone |  |
| 12.3 | Delete project with milestones | 1. Delete project<br>2. Check milestones | Milestones cascade-deleted |  |
| 12.4 | Milestone filter in register | 1. Filter tasks by milestone | Only tasks with that milestone shown |  |

### Story 13 - Task Progress Bar

| # | Scenario | Steps | Expected Result | Pass |
|---|----------|-------|-----------------|------|
| 13.1 | Progress bar shows in register | 1. View task register | Progress bar visible for each task |  |
| 13.2 | Progress bar shows in detail | 1. Open task detail | Progress bar visible |  |
| 13.3 | COMPLETED auto-sets percentComplete 100 | 1. Mark task as COMPLETED<br>2. Check percentComplete | Value is 100 |  |
| 13.4 | Progress updates in real-time | 1. Change task status<br>2. Observe progress bar | Bar updates immediately |  |

### Story 14 - Task Edit Screen

| # | Scenario | Steps | Expected Result | Pass |
|---|----------|-------|-----------------|------|
| 14.1 | Manager can edit all fields | 1. Login as manager<br>2. Click Edit Task<br>3. Change fields<br>4. Save | All changes saved, audit log created |  |
| 14.2 | Edit screen pre-populates fields | 1. Click Edit Task<br>2. View form | All fields show current values |  |
| 14.3 | Audit log for edits | 1. Edit task<br>2. Check audit log | UPDATE action logged with old/new data |  |
| 14.4 | Manager can edit project/milestone | 1. Edit task<br>2. Change project/milestone<br>3. Save | Changes saved |  |

### Story 15 - Attachments

| # | Scenario | Steps | Expected Result | Pass |
|---|----------|-------|-----------------|------|
| 15.1 | Upload attachment | 1. Open task detail<br>2. Click Add Attachment<br>3. Select PDF file<br>4. Upload | File saved to /uploads, metadata in DB |  |
| 15.2 | Upload file > 10 MB | 1. Upload large file | 400: "File size exceeds 10 MB limit" |  |
| 15.3 | Upload disallowed type | 1. Upload .txt file | 400: "File type not allowed" |  |
| 15.4 | Download attachment | 1. Click download icon | File downloads |  |
| 15.5 | Delete attachment (manager) | 1. Login as manager<br>2. Delete attachment | File and DB record removed |  |
| 15.6 | Team member can upload | 1. Login as assignee<br>2. Upload file | Attachment saved |  |
| 15.7 | Viewer cannot upload | 1. Login as viewer<br>2. Try to upload | No upload option visible |  |

### Story 16 - Estimated vs Actual Hours

| # | Scenario | Steps | Expected Result | Pass |
|---|----------|-------|-----------------|------|
| 16.1 | Task shows estimated hours | 1. View task detail with estimatedHours | Hours shown in detail |  |
| 16.2 | Over-budget highlighted | 1. Task with actual > estimated | Text shown in red with "(Over budget)" |  |
| 16.3 | Progress bar shows in register table | 1. View task register | Each task row shows progress bar |  |

---

## Test Scenarios for AMC Module

### Story 17 - Alert Creation

| # | Scenario | Steps | Expected Result | Pass |
|---|----------|-------|-----------------|------|
| 17.1 | Manager creates alert | 1. Login as manager<br>2. Navigate to Alerts → New Alert<br>3. Fill title, type, priority, entity, owner, due date<br>4. Click Create | Alert created with ALT-0001 format, status OPEN, owner notified |  |
| 17.2 | Alert without title rejected | 1. Fill form with empty title<br>2. Submit | Error: "Title is required" |  |
| 17.3 | Past due date rejected | 1. Set due date to yesterday<br>2. Submit | Error: "Due date cannot be in the past" |  |
| 17.4 | Invalid entity rejected | 1. Select non-existent entity<br>2. Submit | Error: "Entity not found" |  |
| 17.5 | Invalid owner rejected | 1. Select non-existent owner<br>2. Submit | Error: "Owner not found or inactive" |  |
| 17.6 | Default reminder/escalation rules created | 1. Create alert<br>2. Check rules | 90/60/30 day reminders + 3/7 day escalations auto-created |  |
| 17.7 | Team member cannot create alert | 1. Login as member<br>2. Navigate to Alerts → New | 403 Forbidden |  |
| 17.8 | Viewer cannot create alert | 1. Login as viewer<br>2. Navigate to Alerts → New | 403 Forbidden |  |

### Story 18 - Alert Lifecycle and Status Transitions

| # | Scenario | Steps | Expected Result | Pass |
|---|----------|-------|-----------------|------|
| 18.1 | Alert status transitions from OPEN | 1. Create alert<br>2. Change status to IN_PROGRESS → SUBMITTED → COMPLETED | Each transition succeeds per ALLOWED_STATUS_TRANSITIONS |  |
| 18.2 | Invalid status transition | 1. OPEN alert<br>2. Try transition to CLOSED | 400: invalid transition |  |
| 18.3 | Complete without evidence (when required) | 1. Set REQUIRE_EVIDENCE_ON_COMPLETE=true<br>2. Complete alert without uploading files | 400: evidence required |  |
| 18.4 | Complete with evidence | 1. Upload evidence file<br>2. Complete alert | Status COMPLETED, audit log created |  |
| 18.5 | Recurring alert generates next occurrence | 1. Complete ANNUAL alert<br>2. Check for child alert | New OPEN alert created with +1 year due date |  |
| 18.6 | ONE_TIME alert does not recur | 1. Complete ONE_TIME alert | No child alert created |  |
| 18.7 | Recurrence end date respected | 1. Complete alert past recurrenceEndDate | No child alert created |  |
| 18.8 | TEAM_MEMBER can update own alert status | 1. Login as member (owner)<br>2. Change status IN_PROGRESS → SUBMITTED | Status updated |  |
| 18.9 | TEAM_MEMBER cannot update others' alert | 1. Login as member<br>2. Update non-owned alert | 403 Forbidden |  |
| 18.10 | Viewer read-only on alerts | 1. Login as viewer<br>2. Attempt PATCH | 403 Forbidden |  |

### Story 19 - Alert Comments

| # | Scenario | Steps | Expected Result | Pass |
|---|----------|-------|-----------------|------|
| 19.1 | Owner adds comment | 1. Login as owner<br>2. Add comment | Comment created, audit log entry |  |
| 19.2 | Manager adds comment | 1. Login as manager<br>2. Add comment | Comment created |  |
| 19.3 | TEAM_MEMBER cannot comment on others' alerts | 1. Login as member<br>2. Comment on non-owned alert | 403 Forbidden |  |
| 19.4 | Viewer cannot comment | 1. Login as viewer<br>2. Comment on alert | 403 Forbidden |  |
| 19.5 | Empty comment rejected | 1. Submit empty/comment whitespace only | 400 validation error |  |

### Story 20 - Alert Evidence Upload

| # | Scenario | Steps | Expected Result | Pass |
|---|----------|-------|-----------------|------|
| 20.1 | Upload evidence file | 1. Open alert detail<br>2. Upload PDF<br>3. Submit | File saved to /uploads, metadata in DB |  |
| 20.2 | Upload file > MaxEvidenceSize | 1. Upload large file | 400: size limit error |  |
| 20.3 | Upload disallowed file type | 1. Upload .exe file | 400: file type not allowed |  |
| 20.4 | Owner uploads evidence | 1. Login as alert owner<br>2. Upload evidence | File saved successfully |  |
| 20.5 | Viewer cannot upload evidence | 1. Login as viewer<br>2. Upload file | 403 Forbidden |  |
| 20.6 | Delete evidence | 1. Owner deletes their evidence | File deleted, DB record removed |  |
| 20.7 | Evidence list retrieval | 1. GET /api/alerts/[id]/evidence | Returns array of evidence files |  |

### Story 21 - Alert Search, Filters, and Stats

| # | Scenario | Steps | Expected Result | Pass |
|---|----------|-------|-----------------|------|
| 21.1 | Filter by type | 1. GET /api/alerts?type=COMPLIANCE_FILING | Only compliance filing alerts returned |  |
| 21.2 | Filter by status | 1. GET /api/alerts?status=OPEN | Only OPEN alerts returned |  |
| 21.3 | Filter by priority | 1. GET /api/alerts?priority=HIGH | Only HIGH priority alerts returned |  |
| 21.4 | Search by title | 1. GET /api/alerts?search=Annual | Alerts with "Annual" in title/ref returned |  |
| 21.5 | Search by alert number | 1. GET /api/alerts?search=ALT-0001 | Matches the alert with number 1 |  |
| 21.6 | Filter by due date range | 1. GET /api/alerts?dueFrom=2025-01-01&dueTo=2025-12-31 | Alerts within range returned |  |
| 21.7 | Overdue alerts filter | 1. GET /api/alerts?overdue=true | Only overdue alerts (past due, not completed) |  |
| 21.8 | Pagination | 1. GET /api/alerts?page=1&limit=10 | Returns paginated results with total count |  |
| 21.9 | Viewer sees own alerts only | 1. Login as viewer<br>2. GET /api/alerts | Only alerts owned by viewer returned |  |
| 21.10 | Dashboard stats | 1. GET /api/alerts/stats | total, statusCounts, typeCounts, overdue, upcoming |  |
| 21.11 | Stats scoped to role | 1. Manager gets team stats | Only their team's alerts reflected |  |

### Story 22 - Regulatory Templates

| # | Scenario | Steps | Expected Result | Pass |
|---|----------|-------|-----------------|------|
| 22.1 | Template library accessible | 1. GET /api/regulatory-templates | Returns array of templates |  |
| 22.2 | Filter templates by type | 1. GET /api/regulatory-templates?type=STATUTORY | Only statutory templates |  |
| 22.3 | Search templates | 1. GET /api/regulatory-templates?search=FISA | Templates matching search |  |
| 22.4 | Create alert from template | 1. POST /api/alerts/from-template | New alert created with template data, default rules applied |  |
| 22.5 | Manager creates template | 1. POST /api/regulatory-templates (manager) | Template created |  |
| 22.6 | Team member cannot create template | 1. POST /api/regulatory-templates (member) | 403 Forbidden |  |
| 22.7 | From template with invalid templateId | 1. POST with bad ID | 400 error |  |

### Story 23 - Global Settings (SUPER_ADMIN)

| # | Scenario | Steps | Expected Result | Pass |
|---|----------|-------|-----------------|------|
| 23.1 | Get reminder rules | 1. GET /api/settings/reminder-rules | Returns default 90/60/30 day rules |  |
| 23.2 | Update reminder rules | 1. PUT /api/settings/reminder-rules with new values | Rules updated |  |
| 23.3 | Manager cannot update settings | 1. PUT /api/settings/reminder-rules (manager) | 403 Forbidden |  |
| 23.4 | Team member cannot access settings | 1. GET /api/settings/reminder-rules (member) | 403 Forbidden |  |

### Story 24 - Alert Detail

| # | Scenario | Steps | Expected Result | Pass |
|---|----------|-------|-----------------|------|
| 24.1 | View alert detail | 1. GET /api/alerts/[id] | Full alert with entity, owner, rules |  |
| 24.2 | Soft delete alert | 1. DELETE /api/alerts/[id] | deletedAt set, not hard deleted |  |
| 24.3 | View soft-deleted alert | 1. GET /api/alerts/[id] (deleted) | 404 Not Found |  |
| 24.4 | Reassign alert | 1. PATCH alert with new ownerId | Owner updated, new owner notified, audit logged |  |
| 24.5 | Team member cannot reassign | 1. PATCH ownerId (member) | 403 Forbidden |  |
| 24.6 | Manager can reassign | 1. PATCH ownerId (manager) | Owner updated, notifications sent |  |

### Story 25 - Entity Management

| # | Scenario | Steps | Expected Result | Pass |
|---|----------|-------|-----------------|------|
| 25.1 | List entities | 1. GET /api/entities | Returns all active entities |  |
| 25.2 | Create entity | 1. POST /api/entities | Entity created |  |
| 25.3 | Update entity | 1. PATCH /api/entities/[id] | Entity updated |  |
| 25.4 | Soft delete entity | 1. DELETE /api/entities/[id] | deletedAt set |  |
| 25.5 | Manager creates entity | 1. POST /api/entities (manager) | Entity created |  |
| 25.6 | Team member cannot create entity | 1. POST /api/entities (member) | 403 Forbidden |  |

---

## Test Scenarios for AMC Frontend (Phase C)

### Story 26 - Alerts List Page (Dual-Pane)

| # | Scenario | Steps | Expected Result | Pass |
|---|----------|-------|-----------------|------|
| 26.1 | Dual-pane layout displays | 1. Navigate to /alerts | Left pane shows list, right pane shows detail |  |
| 26.2 | Filter by type in UI | 1. Open /alerts<br>2. Select type from dropdown<br>3. Apply filter | Only alerts of that type shown |  |
| 26.3 | Filter by status in UI | 1. Select status filter | List updates to show only matching alerts |  |
| 26.4 | Filter by priority in UI | 1. Select priority filter | List updates to show only matching alerts |  |
| 26.5 | Filter by entity in UI | 1. Select entity filter | List updates to show only matching alerts |  |
| 26.6 | Overdue filter | 1. Check "Overdue" checkbox | Only overdue alerts shown |  |
| 26.7 | Due in 30 days filter | 1. Check due date range | Alerts due within range shown |  |
| 26.8 | Search by title/reference/ALT number | 1. Type in search box | Results filter live |  |
| 26.9 | Due-date countdown chip | 1. View alert in list | Shows "Due in X days" or "X days overdue" with color coding |  |
| 26.10 | Alert selection updates detail pane | 1. Click an alert in list | Right pane shows alert details |  |
| 26.11 | Mobile detail opens as sheet | 1. Resize to mobile width<br>2. Click alert | Alert detail opens as full-screen sheet |  |
| 26.12 | No alerts state | 1. Clear all filters with no alerts | Shows "No alerts match your filters" |  |
| 26.13 | Loading state | 1. Refresh /alerts | Skeleton loaders shown while data loads |  |
| 26.14 | Viewer sees only own alerts | 1. Login as viewer<br>2. Navigate to /alerts | Only viewer-owned alerts listed |  |

### Story 27 - Alert Detail Panel

| # | Scenario | Steps | Expected Result | Pass |
|---|----------|-------|-----------------|------|
| 27.1 | Status stepper shows | 1. Select an alert | Status displayed with visual stepper |  |
| 27.2 | Owner and entity displayed | 1. View alert detail | Owner name, entity name shown |  |
| 27.3 | Trigger and due dates displayed | 1. View alert detail | Dates shown with proper formatting |  |
| 27.4 | Recurrence summary shown | 1. View recurring alert | Recurrence type and interval displayed |  |
| 27.5 | Next occurrence preview | 1. Complete alert<br>2. View next occurrence | Child alert's due date shown as "next occurrence" |  |
| 27.6 | Evidence upload section | 1. View alert detail | Evidence section shows existing files + upload area |  |
| 27.7 | Evidence file upload | 1. Upload a PDF<br>2. Refresh | File appears in evidence list |  |
| 27.8 | Comments section | 1. View alert detail | Comments displayed with author and timestamp |  |
| 27.9 | Reminder history shown | 1. View alert detail | Reminder rules listed |  |
| 27.10 | Escalation history shown | 1. View alert detail | Escalation rules listed |  |
| 27.11 | Audit timeline visible | 1. View alert detail | Audit log entries shown chronologically |  |
| 27.12 | TEAM_MEMBER sees only relevant actions | 1. Login as member (owner)<br>2. View own alert | Complete, Edit buttons visible |  |
| 27.13 | TEAM_MEMBER cannot edit others' alerts | 1. Login as member<br>2. View non-owned alert | No edit/complete/delete buttons |  |
| 27.14 | Viewer sees no action buttons | 1. Login as viewer<br>2. View alert | Read-only, no action buttons |  |

### Story 28 - Alert Create/Edit Form

| # | Scenario | Steps | Expected Result | Pass |
|---|----------|-------|-----------------|------|
| 28.1 | Create alert form loads | 1. Navigate to /alerts/new | Form shows with all required fields |  |
| 28.2 | Edit alert form pre-fills | 1. Navigate to /alerts/[id]/edit | All fields populated with current values |  |
| 28.3 | Title field validation | 1. Leave title empty<br>2. Submit | Error: "Title is required" |  |
| 28.4 | Entity selection (searchable) | 1. Open entity dropdown<br>2. Search or select | Entity selected, reflected in form |  |
| 28.5 | Regulatory clause field | 1. Fill regulatory clause | Value saved on submit |  |
| 28.6 | Owner selection | 1. Select owner from dropdown | Only TEAM_MEMBER/MANAGER users shown |  |
| 28.7 | Trigger and due dates | 1. Set trigger and due dates | Dates validated (trigger <= due) |  |
| 28.8 | Past due date rejected | 1. Set due date to yesterday | Error: "Due date cannot be in the past" |  |
| 28.9 | Priority selection | 1. Select priority | Valid priority saved |  |
| 28.10 | Recurrence type selection | 1. Select recurrence type | Custom shows interval input |  |
| 28.11 | Custom recurrence interval | 1. Select CUSTOM<br>2. Enter interval days | Interval days saved |  |
| 28.12 | Recurrence end date | 1. Set end date | End date saved |  |
| 28.13 | Default reminder rules shown | 1. Open form | 90/60/30 day reminders shown as chips |  |
| 28.14 | Remove reminder rule | 1. Click X on reminder chip | Rule removed from form |  |
| 28.15 | Add reminder rule | 1. Click "Add Reminder"<br>2. Set days | New rule added as chip |  |
| 28.16 | Escalation preview visible | 1. View form | Default escalation rules shown |  |
| 28.17 | Add escalation rule | 1. Click "Add Rule" | New rule added |  |
| 28.18 | Remove escalation rule | 1. Click trash icon | Rule removed |  |
| 28.19 | Load from template | 1. Click "Load from Template"<br>2. Select template | Title, type, clause pre-filled |  |
| 28.20 | Evidence required toggle | 1. Toggle checkbox | Setting saved |  |
| 28.21 | Form submission success | 1. Fill valid data<br>2. Submit | Toast: "Alert created/updated"<br>Navigate to alerts list |  |
| 28.22 | Form submission error | 1. Submit invalid data | Inline errors shown, no toast |  |
| 28.23 | Loading state on submit | 1. Submit form | Button shows "Saving..." |  |
| 28.24 | Cancel button | 1. Open form<br>2. Make changes<br>3. Click Cancel | Unsaved changes discarded, returned to /alerts |  |

### Story 29 - Entities Page

| # | Scenario | Steps | Expected Result | Pass |
|---|----------|-------|-----------------|------|
| 29.1 | Entity list displays | 1. Navigate to /entities | All active entities shown |  |
| 29.2 | Entity search | 1. Type in search box | List filters live |  |
| 29.3 | Create entity (manager) | 1. Login as manager<br>2. Click New Entity<br>3. Fill form<br>4. Submit | Entity created, toast shown |  |
| 29.4 | Create entity (team member) | 1. Login as member<br>2. Navigate to /entities | No "New Entity" button |  |
| 29.5 | Edit entity | 1. Click edit icon on entity | Form pre-fills, save updates |  |
| 29.6 | Delete entity confirmation | 1. Click delete icon | Confirmation dialog appears |  |
| 29.7 | Delete entity confirmed | 1. Confirm deletion | Entity deleted, toast shown |  |
| 29.8 | Entity loading state | 1. Refresh /entities | Skeleton loaders shown |  |
| 29.9 | Empty state | 1. No entities match search | Shows "No entities found" |  |

### Story 30 - Calendar View

| # | Scenario | Steps | Expected Result | Pass |
|---|----------|-------|-----------------|------|
| 30.1 | Calendar renders | 1. Navigate to /alerts/calendar | Month grid displayed |  |
| 30.2 | Month navigation | 1. Click prev/next arrows | Calendar changes month |  |
| 30.3 | Month/year selector | 1. Use dropdown selectors | Calendar updates to selected month/year |  |
| 30.4 | Today button | 1. Click "Today" | Calendar jumps to current month |  |
| 30.5 | Alert shown on correct date | 1. Calendar shows alerts | Alerts appear on their due date cells |  |
| 30.6 | Click alert opens detail | 1. Click alert in calendar cell | Alert detail opens |  |
| 30.7 | Current day highlighted | 1. Calendar shows today's date | Today's cell has highlighted background |  |
| 30.8 | More than 3 alerts show "+N more" | 1. Day has 4+ alerts | Shows "+1 more" etc. |  |
| 30.9 | Loading state | 1. Refresh /alerts/calendar | Skeleton shown during load |  |

### Story 31 - Navigation and Dashboard

| # | Scenario | Steps | Expected Result | Pass |
|---|----------|-------|-----------------|------|
| 31.1 | Alerts in navigation | 1. Look at main nav | "Alerts" link visible |  |
| 31.2 | Overdue count badge | 1. Have overdue alerts | Red badge with count on Alerts nav |  |
| 31.3 | Badge updates | 1. Complete an overdue alert | Badge count decrements |  |
| 31.4 | Entities in navigation | 1. Look at main nav | "Entities" link visible |  |
| 31.5 | Calendar in navigation | 1. Look at main nav | "Calendar" link visible |  |
| 31.6 | Compliance widgets on dashboard | 1. Navigate to /dashboard | Alerts by status, due in 30/60/90, overdue list visible |  |
| 31.7 | Dashboard quick actions | 1. View compliance widgets | Links to alerts, new alert, calendar, entities |  |

### Story 32 - Toasts and Confirmations

| # | Scenario | Steps | Expected Result | Pass |
|---|----------|-------|-----------------|------|
| 32.1 | Creation toast | 1. Create alert<br>2. Observe corner | Toast: "Alert created successfully" |  |
| 32.2 | Update toast | 1. Update alert<br>2. Observe corner | Toast: "Alert updated successfully" |  |
| 32.3 | Delete confirmation | 1. Click delete on alert | Dialog: "Are you sure you want to delete?" |  |
| 32.4 | Delete confirmed toast | 1. Confirm delete | Toast: "Alert deleted"<br>Alert removed from list |  |
| 32.5 | Error toast | 1. Trigger API error | Toast with error message |  |
| 32.6 | Completion toast | 1. Complete alert | Toast: "Alert completed successfully" |  |
| 32.7 | Template loaded toast | 1. Load from template | Toast: "Loaded template: ..." |  |

---

## Test Scenarios for AMC Notifications & Automation (Phase D)

### Story 33 - Notification UI

| # | Scenario | Steps | Expected Result | Pass |
|---|----------|-------|-----------------|------|
| 33.1 | Bell icon with unread badge | 1. Have unread notifications<br>2. Look at top bar | Bell icon shows red badge with count |  |
| 33.2 | Notification dropdown | 1. Click bell icon<br>2. Observe dropdown | Last 10 notifications shown with titles/messages |  |
| 33.3 | Mark all read in dropdown | 1. Click "Mark all read" in dropdown | Badge clears, all notifications marked read |  |
| 33.4 | Click notification deep-links | 1. Click notification about task<br>2. Observe navigation | Opens /tasks/[id] or /alerts page |  |
| 33.5 | Poll every 60 seconds | 1. Keep /notifications open<br>2. Wait 60+ seconds | Notifications refresh automatically |  |
| 33.6 | /notifications page filters | 1. Navigate to /notifications<br>2. Filter by unread | Only unread notifications shown |  |
| 33.7 | /notifications page type filter | 1. Select type filter | Only notifications of that type shown |  |
| 33.8 | /notifications page pagination | 1. Have >20 notifications<br>2. Click Load More | More notifications loaded |  |
| 33.9 | User sees only own notifications | 1. Login as different user<br>2. View /notifications | Only that user's notifications shown |  |

### Story 34 - Task Notifications

| # | Scenario | Steps | Expected Result | Pass |
|---|----------|-------|-----------------|------|
| 34.1 | Task status change notification | 1. Manager changes task status<br>2. Assignee/creator checks notifications | Notification sent about status change |  |
| 34.2 | Task BLOCKED notification | 1. Set task to BLOCKED with reason<br>2. Manager/creator checks notifications | Notification with blocked reason sent |  |
| 34.3 | Task overdue notification (daily job) | 1. Run daily job<br>2. Overdue task exists | Task overdue notification sent to assignee |  |
| 34.4 | Task due tomorrow reminder | 1. Run daily job<br>2. Task due tomorrow | Due tomorrow notification sent to assignee |  |
| 34.5 | Task escalation notification | 1. Task overdue >7 days<br>2. Run daily job | Escalation sent to manager |  |
| 34.6 | Verification result notification | 1. Manager verifies/rejects task<br>2. Assignee checks notifications | Verified/Rejected notification sent |  |

### Story 35 - Scheduler / Automation

| # | Scenario | Steps | Expected Result | Pass |
|---|----------|-------|-----------------|------|
| 35.1 | POST /api/jobs/run requires secret | 1. Call endpoint without x-cron-secret | Returns 401 Unauthorized |  |
| 35.2 | POST /api/jobs/run with wrong secret | 1. Call endpoint with wrong header | Returns 401 Unauthorized |  |
| 35.3 | POST /api/jobs/run succeeds | 1. Call with correct secret<br>2. Observe response | Returns success with stats |  |
| 35.4 | Job marks overdue alerts | 1. Create alert due yesterday<br>2. Run job | Alert status changed to OVERDUE |  ✅ |
| 35.5 | Job sends reminders (global + alert-specific rules) | 1. Create alert due in 30 days<br>2. Set 30-day global reminder rule<br>3. Run job | Reminder notification sent |  ✅ |
| 35.6 | Job deduplicates reminders | 1. Run job twice same day<br>2. Check AlertReminderLog | Only 1 log entry created |  ✅ |
| 35.7 | Job escalates overdue alerts (global rules) | 1. Overdue alert >3 days<br>2. Set global escalation rule<br>3. Run job | Escalation notification sent |  ✅ |
| 35.8 | Job generates recurrence | 1. Completed MONTHLY alert<br>2. Run job | New OPEN child alert created |  ✅ |
| 35.9 | Job is idempotent | 1. Run job twice<br>2. Check stats second run | All counts are 0 on second run |  ✅ |
| 35.10 | npm run jobs:run works | 1. Run `npm run jobs:run`<br>2. Observe output | Job executes and prints stats |  |

### Story 36 - Audit Timeline UI

| # | Scenario | Steps | Expected Result | Pass |
|---|----------|-------|-----------------|------|
| 36.1 | AuditTimeline on task detail | 1. View task detail<br>2. Check bottom section | Audit entries shown chronologically |  |
| 36.2 | AuditTimeline on alert detail | 1. View alert detail<br>2. Check bottom section | Audit entries shown chronologically |  |
| 36.3 | Human-readable change summary | 1. Status change audit entry<br>2. Read description | Shows "Status: Open → In Progress" |  |
| 36.4 | Reassignment summary | 1. Reassignment audit entry<br>2. Read description | Shows "Reassigned from Alice to Bob" |  |
| 36.5 | /admin/audit page (SUPER_ADMIN) | 1. Login as SUPER_ADMIN<br>2. Navigate to /admin/audit | Audit log entries displayed |  |
| 36.6 | /admin/audit filters | 1. Filter by entity/action/user/date | Results filtered accordingly |  |
| 36.7 | /admin/audit CSV export | 1. Click Export CSV<br>2. Observe download | CSV file downloaded |  |
| 36.8 | /admin/audit access restricted | 1. Login as non-SUPER_ADMIN<br>2. Navigate to /admin/audit | Redirected to dashboard |  |

### Story 37 - Automation Settings

| # | Scenario | Steps | Expected Result | Pass |
|---|----------|-------|-----------------|------|
| 37.1 | /admin/automation page (SUPER_ADMIN) | 1. Login as SUPER_ADMIN<br>2. Navigate to /admin/automation | Settings page loaded |  |
| 37.2 | Edit reminder rules | 1. Change reminder days<br>2. Click Save | Rules saved, toast shown |  |
| 37.3 | Edit escalation rules | 1. Change escalation days/role<br>2. Click Save | Rules saved, toast shown |  |
| 37.4 | Validation - positive days | 1. Enter 0 or negative days<br>2. Try to add | Error shown, rule not added |  |
| 37.5 | Access restricted | 1. Login as non-SUPER_ADMIN<br>2. Navigate to /admin/automation | Redirected to dashboard |  |

---

## Test Scenarios for Administration, Profile & Reporting (Phase E)

### Story 38 - Settings Page

| # | Scenario | Steps | Expected Result | Pass |
|---|----------|-------|-----------------|------|
| 38.1 | Settings page accessible | 1. Navigate to /settings | Profile, password, preferences shown |  |
| 38.2 | Profile edit (name) | 1. Change name<br>2. Click Save | Toast: "Profile updated", name updated |  |
| 38.3 | Change password - valid | 1. Enter current, new, confirm<br>2. Click Change | Toast: "Password changed successfully" |  |
| 38.4 | Change password - wrong current | 1. Enter wrong current password | Error: "Current password is incorrect" |  |
| 38.5 | Change password - too short | 1. Enter new password < 8 chars | Error: "Password must be at least 8 characters" |  |
| 38.6 | Theme preference | 1. Select Dark/Light/System | Theme applied immediately |  |
| 38.7 | Notification preferences | 1. Toggle email/desktop | Preference saved |  |
| 38.8 | Role-based restrictions | 1. Login as non-editable role | Edit disabled for restricted fields |  |

### Story 39 - Admin Users Management

| # | Scenario | Steps | Expected Result | Pass |
|---|----------|-------|-----------------|------|
| 39.1 | Admin users list | 1. Login as SUPER_ADMIN<br>2. Navigate to /admin/users | All users listed with roles |  |
| 39.2 | Create user | 1. Click New User<br>2. Fill form<br>3. Submit | User created, appears in list |  |
| 39.3 | Edit user role | 1. Click Edit on user<br>2. Change role<br>3. Save | Role updated |  |
| 39.4 | Deactivate user | 1. Click Deactivate<br>2. Confirm | User marked inactive |  |
| 39.5 | Cannot deactivate self | 1. Try to deactivate own account | Error: "Cannot deactivate your own account" |  |
| 39.6 | Cannot demote self | 1. Try to change own role | Error: "Cannot change your own role" |  |
| 39.7 | Access restricted | 1. Login as non-SUPER_ADMIN<br>2. Navigate to /admin/users | Redirected to dashboard |  |
| 39.8 | Deactivated user cannot login | 1. Deactivate a user<br>2. Try to login as that user | Login fails |  |

### Story 40 - Admin Config

| # | Scenario | Steps | Expected Result | Pass |
|---|----------|-------|-----------------|------|
| 40.1 | Config page accessible | 1. Login as SUPER_ADMIN<br>2. Navigate to /admin/config | Config page loaded |  |
| 40.2 | Task categories tab | 1. Click Task Categories | Categories listed with labels/sort order |  |
| 40.3 | Entity types tab | 1. Click Entity Types | Entity types listed with labels |  |
| 40.4 | Save category changes | 1. Edit label/sort order<br>2. Click Save | Toast: "Category saved" |  |
| 40.5 | Access restricted | 1. Login as non-SUPER_ADMIN<br>2. Navigate to /admin/config | Redirected to dashboard |  |

### Story 41 - Reports

| # | Scenario | Steps | Expected Result | Pass |
|---|----------|-------|-----------------|------|
| 41.1 | Reports page accessible | 1. Login as MANAGER<br>2. Navigate to /reports | Reports page loaded |  |
| 41.2 | Task summary stats | 1. View Tasks tab | Total, overdue, blocked, completion rate shown |  |
| 41.3 | Task breakdown by status | 1. View Tasks tab | Tasks grouped by status |  |
| 41.4 | Overdue ageing | 1. View Tasks tab | Ageing buckets (1-7, 8-30, 30+) shown |  |
| 41.5 | Compliance summary | 1. View Compliance tab | Alerts by status/type/overdue shown |  |
| 41.6 | CSV export tasks | 1. Click Export CSV on tasks | CSV file downloaded |  |
| 41.7 | CSV export compliance | 1. Click Export CSV on compliance | CSV file downloaded |  |
| 41.8 | Date range filter | 1. Set date range<br>2. Apply filters | Results filtered by date |  |
| 41.9 | Access restricted | 1. Login as TEAM_MEMBER/VIEWER<br>2. Navigate to /reports | Redirected to dashboard |  |

### Story 42 - Global Search

| # | Scenario | Steps | Expected Result | Pass |
|---|----------|-------|-----------------|------|
| 42.1 | Open search | 1. Press Ctrl+K<br>2. Observe dialog | Search dialog opens |  |
| 42.2 | Search tasks | 1. Type task title<br>2. Observe results | Matching tasks shown |  |
| 42.3 | Search alerts | 1. Type alert title/ref<br>2. Observe results | Matching alerts shown |  |
| 42.4 | Search entities | 1. Type entity name<br>2. Observe results | Matching entities shown |  |
| 42.5 | Click result | 1. Click search result | Navigates to task/alert/entity |  |
| 42.6 | Close search | 1. Press Escape<br>2. Observe dialog | Dialog closes |  |
| 42.7 | Empty results | 1. Type non-matching query | "No results found" shown |  |

### Story 43 - Security

| # | Scenario | Steps | Expected Result | Pass |
|---|----------|-------|-----------------|------|
| 43.1 | Login rate limiting | 1. Fail login 5 times<br>2. Try 6th time | Login blocked temporarily |  |
| 43.2 | No passwordHash in API | 1. Check any user API response | passwordHash never present |  |
| 43.3 | Secure cookies | 1. Inspect session cookie | Secure, HttpOnly, SameSite set |  |
| 43.4 | Security headers | 1. Check response headers | X-Content-Type-Options, X-Frame-Options present |  |
| 43.5 | Cross-user data isolation | 1. Login as user A<br>2. Try to access user B's data | 403 Forbidden |  |