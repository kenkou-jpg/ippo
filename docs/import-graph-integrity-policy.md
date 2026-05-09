# Import Graph Integrity Policy

This policy prevents runtime 404 failures caused by importing files that do not exist.

## Why this matters

The app now runs as a minimal shell + Vite module graph.

That means a missing module import can block startup before hydration, rendering, record save guards, or diagnostics can run.

Example failure:

```txt
GET /src/modules/example-missing-module.js 404
```

This is not a cosmetic warning. It can break the app startup chain.

## Required rule

Every relative module import must point to an existing committed file.

```js
import './some-runtime.js';
```

requires:

```txt
src/modules/some-runtime.js
```

or the correct relative path from the importing file.

## Before adding a new import

Check:

- [ ] The target file already exists in the same branch.
- [ ] The filename matches exactly, including hyphens and casing.
- [ ] The import is needed now, not only planned for a future PR.
- [ ] `npm run build` passes locally or in CI.

## Before deleting or renaming a module

Search for references first:

```bash
grep -R "module-name" src app.html index.html kk-app.js js || true
```

Then confirm:

- [ ] All imports were removed or updated.
- [ ] Any window bridge compatibility path still needed by runtime remains intact.
- [ ] `npm run build` passes.

## CI requirement

GitHub Actions must run:

```bash
npm ci
npm run build
```

on pull requests to `main` and pushes to `main`.

This catches:

- missing relative imports
- syntax errors
- unresolved Vite module graph entries
- build-breaking dependency issues

## Guard module rule

Guard modules must not be imported speculatively.

Do not add this:

```js
import './future-guard.js';
```

unless `future-guard.js` is included in the same PR.

If the guard is planned but not implemented yet, track it in docs or an issue instead of importing it.

## Fix strategy for missing imports

When a missing import is found:

1. Confirm whether the target module ever existed.
2. If it never existed, remove the import unless the behavior is truly required.
3. If the behavior is required, add the real implementation in the same PR.
4. Avoid no-op shim files unless needed as a temporary release unblocker.
5. Add or verify CI build coverage.

## Review checklist

For every PR touching `src/main.js`, `src/modules/*`, or guard/runtime files:

- [ ] No import points to a missing file.
- [ ] No speculative guard import was added.
- [ ] No runtime sequencing import was reordered without explanation.
- [ ] No compatibility bridge was removed casually.
- [ ] `npm run build` passes.

## Current policy status

The repository includes a build workflow at:

```txt
.github/workflows/build.yml
```

This workflow is the baseline protection for module graph integrity.
