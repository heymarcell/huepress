---
description: iteratively fix all lint and test errors until everything passes
---

# Fix Workflow

Iteratively fix all lint errors, warnings, and test failures until everything passes.

## Step 1: TypeScript Check

// turbo

```bash
pnpm exec tsc --noEmit
```

If errors, fix them and re-run until clean.

## Step 2: Lint Check

// turbo

```bash
pnpm run lint
```

If errors or warnings, fix them. Common fixes:

- `@typescript-eslint/no-explicit-any` → Use proper types like `unknown`, `string`, or interfaces
- `react-hooks/exhaustive-deps` → Add deps or wrap in useMemo
- Unused vars → Remove or prefix with `_`

Re-run until 0 errors AND 0 warnings.

## Step 3: Tests

// turbo

```bash
pnpm test tests/api/ -- --run
```

Use `--run` flag to run once (not watch mode). If tests fail, fix and re-run.

## Step 4: Final Verification

// turbo

```bash
pnpm exec tsc --noEmit && pnpm run lint && pnpm test tests/api/ -- --run
```

## Key Rules

1. **Run tests with `--run` flag** to avoid watch mode hanging
2. **Fix warnings too** - not just errors
3. **Kill stale processes** if tests seem stuck: `pkill -f vitest`
4. **One file at a time** - fix methodically, don't spray fixes everywhere
5. **Re-run after each fix** - verify incrementally
