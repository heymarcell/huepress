---
description: iteratively fix all lint and test errors until everything passes
---

# Fix Workflow

This workflow iteratively fixes all lint errors, lint warnings, and test failures until everything passes.

## Step 1: Run TypeScript Check

// turbo

```bash
npx tsc --noEmit
```

**If errors occur:** Fix all TypeScript errors before proceeding.

## Step 2: Run Linter

// turbo

```bash
npm run lint
```

**If errors or warnings occur:**

1. Identify the files and issues
2. Fix each error/warning
3. Re-run `npm run lint` to verify
4. Repeat until 0 errors and 0 warnings

**Do NOT skip warnings.** All warnings must be fixed.

## Step 3: Run Tests

// turbo

```bash
npm test tests/api/
```

**If tests fail:**

1. Identify failing tests and error messages
2. Fix the root cause (could be in source code or test code)
3. Re-run failing test to verify: `npm test tests/api/<file>.test.ts`
4. Repeat until all tests pass

## Step 4: Final Verification

// turbo

```bash
npx tsc --noEmit && npm run lint && npm test tests/api/
```

All checks must pass before considering the fix complete.

## Iteration Loop

If any step fails after a fix:

1. Go back to the failing step
2. Apply another fix
3. Re-run checks
4. Continue until all pass

**Do not give up.** Keep iterating until everything passes.
