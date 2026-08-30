# Phase F-1 — Insights & Body Understanding UX

## Goal

Improve the insights experience after the migration/stabilization phase by making existing record patterns easier to understand.

This phase must remain read-only from a persistence perspective.

The goal is not to change how records are saved or synced.

The goal is to improve how users understand:

- symptom trends
- cycle/body condition patterns
- record continuity
- gentle self-care signals
- changes over time

## Core principle

Insights should help the user feel:

```txt
"I can understand my body a little better from what I already recorded."
```

Do not turn insights into diagnosis, medical judgment, or alarmist interpretation.

## Scope

### Allowed

- improve insight copy
- improve readability of trend summaries
- improve empty/loading states
- improve continuity encouragement
- add read-only derived summaries from existing records
- add gentle explanations for incomplete data
- improve visual grouping of existing insight cards
- add accessibility labels and semantic headings

### Not allowed

- changing record persistence
- changing `saveState`
- changing Supabase sync order
- changing localStorage keys
- mutating records from insights
- adding diagnosis-like claims
- adding medical recommendations without disclaimers
- changing render timing
- changing hydration sequencing

## UX targets

### 1. Empty state

When records are insufficient, insights should explain:

- how many days are needed before trends become useful
- what kinds of records help insights improve
- reassurance that missing days are normal

### 2. Pattern readability

For existing records, emphasize:

- repeated symptoms
- symptom intensity changes
- cycle day context if available
- mood/body condition combinations
- fasting or lifestyle context only if already recorded

### 3. Continuity motivation

Avoid guilt-based language.

Prefer:

- gentle encouragement
- "small patterns are enough"
- "missing days are okay"
- "record when you can"

### 4. Body understanding cards

Potential cards:

- Recent body signals
- Repeated symptoms
- Calm/rough day balance
- Cycle context
- Notes from your records
- What changed this week

All cards should be derived from existing local state only.

## Data safety

Insights may read:

- `state.records`
- record repository read-only helpers
- existing normalized record snapshots

Insights must not write:

- records
- localStorage
- Supabase
- sync queues
- identity guards

## Medical safety

Use non-diagnostic language.

Allowed wording examples:

- "傾向が見えはじめています"
- "記録上は〜の日が多いようです"
- "気になる変化が続く場合は、医療者に相談してください"

Avoid:

- "改善しています" as medical certainty
- "悪化しています" as medical certainty
- disease prediction
- treatment advice
- medication advice

## Suggested implementation order

### Step 1 — Audit current insights rendering

Check:

- empty state
- 3-day record state
- 7-day record state
- 30-day record state
- records with symptoms only
- records with mood only
- records with cycle data

### Step 2 — Improve copy and grouping first

Start with low-risk changes:

- headings
- helper text
- empty state
- section labels
- card grouping

### Step 3 — Add derived summaries only if read-only

Only add new summaries if they:

- read existing records
- do not mutate state
- do not change save/sync behavior
- tolerate missing fields
- fail silently or show a gentle empty state

## Validation checklist

- [ ] insights renders with zero records
- [ ] insights renders with partial records
- [ ] insights renders with 7+ records
- [ ] missing optional fields do not crash insights
- [ ] records are not mutated by insights
- [ ] save/edit still works after visiting insights
- [ ] offline state still renders insights
- [ ] no medical diagnosis-like language is introduced

## Console checks

After using insights and then saving/editing a record, run:

```js
window.ippoRecordFreshnessGuardSummary?.()
window.ippoEditSaveIdentityGuardSummary?.()
window.ippoStabilizationAssertionsRuntimeSummary?.()
window.ippoVerifyLastRecordSave?.()
```

Expected:

- no record shrink
- no duplicate same-date records
- no stale overwrite
- no identity guard violations

## PR boundary

A safe Phase F-1 PR may include:

- docs
- copy changes
- CSS grouping changes
- read-only insight helper functions
- empty state improvements

A risky Phase F-1 PR must be split if it includes:

- persistence writes
- sync changes
- record normalization changes
- render timing changes
- hydration changes
- medical interpretation changes

## Completion definition

Phase F-1 is complete when insights feel more useful and human without increasing persistence, sync, or medical-safety risk.
