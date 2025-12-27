---
description: how to commit changes with proper linting and testing
---

# Commit Workflow

## Step 1: Run TypeScript Check

// turbo

```bash
npx tsc --noEmit
```

If errors occur, fix them before proceeding.

## Step 2: Run Linter

// turbo

```bash
npm run lint
```

Fix any errors. Warnings are acceptable but should be minimized over time.

## Step 3: Run Tests (Optional but Recommended)

For targeted changes, run related tests:

```bash
npm test tests/api/<related-test>.test.ts
```

For broader changes, run all API tests:

```bash
npm test tests/api/
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

## Quick Commit (Skip Tests)

For small, safe changes:

// turbo

```bash
npx tsc --noEmit && npm run lint && git add -A && git commit -m "<message>" && git push
```
