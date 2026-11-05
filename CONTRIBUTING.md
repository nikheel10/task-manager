# Contributing to TaskAMC

Thanks for your interest in contributing! This document covers the workflow and conventions.

## Branch Strategy

- **`main`** is the production-ready branch. Direct pushes are blocked.
- All work must happen on a **feature branch**:

  ```bash
  git checkout main
  git pull
  git checkout -b feature/my-feature-name
  ```

- Use descriptive branch names:
  - `feature/alert-notifications`
  - `fix/timezone-validation-bug`
  - `docs/api-readme`

## Pull Requests

1. Push your feature branch: `git push origin feature/my-feature-name`
2. Open a Pull Request on GitHub
3. At least one review is required before merging
4. The PR template must be filled out
5. CI checks (`typecheck`, `build`, `test:jobs`) must pass

## Code Standards

```bash
npm run typecheck   # TypeScript must pass
npm run lint        # ESLint must pass
npm run build       # Production build must succeed
npm run test:jobs   # Job tests must pass
```

## Roles & Permissions

- **SUPER_ADMIN**: Full access (users, config, audit, reports)
- **MANAGER**: Create/assign/verify tasks & alerts, manage team
- **TEAM_MEMBER**: View & update own tasks/alerts, comment, attach evidence
- **VIEWER**: Read-only access

## Reporting Issues

Use GitHub Issues. Include:
- Steps to reproduce
- Expected vs actual behavior
- Browser / environment details
