---
description: how to commit changes with proper linting and testing
---

# Commit Workflow

This workflow ensures all code quality checks pass before committing. **Fix all errors and warnings before proceeding to commit.**

## Step 1: Run TypeScript Check

// turbo

```bash
npx tsc --noEmit
```

**If errors occur:** Fix all TypeScript errors before proceeding. Do not skip this step.

## Step 2: Run Linter and Fix Issues

// turbo

```bash
npm run lint
```

**If errors or warnings occur:**

1. Fix all lint errors (required)
2. Fix all lint warnings (required for new/modified code)
3. Re-run lint to verify fixes
4. Only proceed when lint passes with 0 errors and 0 new warnings

Common fixes:

- `@typescript-eslint/no-explicit-any` → Replace `any` with proper types
- `react-hooks/exhaustive-deps` → Add missing dependencies or wrap in useMemo
- Unused variables → Remove or prefix with underscore

## Step 3: Run Tests

// turbo

```bash
npm test tests/api/
```

**If tests fail:**

1. Fix failing tests
2. Re-run tests to verify fixes
3. Only proceed when all tests pass

For targeted changes, you may run specific tests:

```bash
npm test tests/api/<related-test>.test.ts
```

## Step 4: Stage and Commit

// turbo

```bash
git add -A && git commit -m "<type>: <description>"
```

### Commit Types

- `feat`: New feature
- `fix`: Bug fix
- `refactor`: Code restructuring without behavior change
- `docs`: Documentation only
- `chore`: Build/tooling changes
- `test`: Test additions/changes

### Commit Message Format

```
<type>: <short summary>

- Detail 1
- Detail 2
```

## Step 5: Push to Remote

// turbo

```bash
git push
```

## Pre-Commit Checklist

Before committing, ensure:

- [ ] `npx tsc --noEmit` passes with 0 errors
- [ ] `npm run lint` passes with 0 errors and 0 new warnings
- [ ] `npm test tests/api/` passes with all tests green
- [ ] Commit message follows conventional format
