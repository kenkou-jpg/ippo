# ippo Architecture

## Dependency Direction

```
Feature → Service → Domain → Infrastructure
              ↑
         Application
              ↑
         policies / shared (SSOT — no upstream deps)
```

All dependencies flow **inward only**. Inner layers must never import from outer layers.

## Layer Responsibilities

| Layer | Location | Allowed | Forbidden |
|-------|----------|---------|-----------|
| features/ | `features/` | UI, calls application | DB access, domain imports |
| application/ | `application/` | Orchestration, use-cases | UI logic, direct DB |
| services/ | `services/` | Multi-domain orchestration | UI logic, direct DB |
| domains/ | `domains/` | Business logic, pure functions | UI, DB, feature imports |
| infrastructure/ | `infrastructure/` | DB, external APIs, stubs | Business logic |
| shared/ | `shared/` | Types, events, constants | Business logic, DB |
| policies/ | `policies/` | SSOT constants only | Any logic |

---

## Record Domain (established PR-001.1)

### New clean structure (root-level)

```
domains/record/
  record.entity.ts      — RecordEntity, RecordDraft types (SCHEMA_V1 aligned)
  record.service.ts     — isNewRecord, calculateStreak, applyRecordToStreakState (pure)
  record.validator.ts   — validateDraft, validateRecordDate, normalizeRecordDate (pure)

infrastructure/record/
  record.repository.ts  — IRecordRepository interface + StubRecordRepository

application/record/
  createRecord.ts       — CreateRecordCommand use-case (DI via repository)
  normalizeRecord.ts    — normalizeLegacyDraft (legacy → domain shape)
```

### Legacy bridge (src/modules/record.js)

`src/modules/record.js` is a **Strangler Pattern facade** connecting the legacy
`app-legacy.js` runtime to the clean domain. As of PR-001.1:

- **Streak / totalDays logic extracted** → delegates to `domains/record/record.service.ts`
- **UI logic** (`_buildDraftFromUIImpl`, `_showSaveSuccessOverlay`) remains temporarily
  → migrate to `features/record/` in PR-003
- **Trace / debug infrastructure** remains temporarily
  → move to `infrastructure/debug/` in PR-004

`record.js` will be removed when `app-legacy.js` is fully decommissioned.

### Known violation (tracked for PR-002)

```
src/domains/record/RecordRepository.js
  VIOLATION: imports supabase directly (infra dependency in domain layer)
  FIX:       implement IRecordRepository from infrastructure/record/record.repository.ts
             move supabase calls to infrastructure/record/supabase.record.repository.ts
```

---

## Data Flow

```
User action (UI)
  → features/record/RecordForm
  → application/record/createRecord (command)
    → domains/record/record.validator (validation)
    → domains/record/record.service (business rules)
    → infrastructure/record/IRecordRepository (persistence)
      → Supabase / localStorage
  → shared/events RECORD_CREATED (notification)
  → features/home/HomeView (re-render)
```

---

## SSOT Locations

| Concern | Canonical location |
|---------|-------------------|
| Quality score weights | `policies/index.ts → QUALITY_SCORE` |
| Tier rules | `policies/index.ts → TIER_RULES` |
| Consent levels | `policies/index.ts → CONSENT_LEVELS` |
| Domain event names | `shared/events/index.ts → EVENTS` |
| Base entity types | `shared/types/base.ts` |
| Record entity shape | `domains/record/record.entity.ts` |
| Repository interface | `infrastructure/record/record.repository.ts → IRecordRepository` |

No constant may be defined outside its canonical location. Duplication = violation.

---

## Forbidden Dependency Patterns

```
❌ domain  → features
❌ domain  → services
❌ domain  → infrastructure (direct)
❌ domain  → supabase (direct)
❌ feature → DB
❌ feature → feature (cross-feature)
❌ shared  → any domain
❌ policies → any domain
```

---

## PR Milestones

| PR | Scope | Status |
|----|-------|--------|
| PR-001 | Repository skeleton, SSOT, events, smoke test | ✅ Complete |
| PR-001.1 | Legacy cleanup, domain isolation, streak extraction | ✅ Complete |
| PR-002 | Domain model full implementation (all entities) | 🔜 Next |
| PR-003 | Features layer — record UI migration | ⏳ |
| PR-004 | Debug infrastructure isolation | ⏳ |
| PR-007 | SupabaseRecordRepository (fix infra violation) | ⏳ |
