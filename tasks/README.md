# tasks/ — Task documentation

Lightweight task structure for sub-agents. For larger tasks, copy `TASK.md` to
`tasks/<task-name>.md` and fill it in. This lets a sub-agent understand the
task without the conversation history.

## Workflow

```
Main Agent
  → reads AGENTS.md + CODEBASE.md (map)
  → creates tasks/<task>.md (from TASK.md template) with goal + acceptance criteria
  → delegates to Feature Agent (reads only docs/features/<feature>.md + listed source)
  → Feature Agent implements
  → Testing Agent (reads AGENTS + CODEBASE + tests/CODEBASE.md + feature doc;
    runs `npm run lint` + `npm test`; uses tests/MANUAL-CHECKLIST.md for device
    checks; produces a test report — NEVER claims OS-level PASS without a device)
  → Review Agent (checks boundaries, race conditions, doc accuracy, regressions;
    reports findings, does NOT silently change code)
  → Main Agent (reviews reports, commits, pushes)
```

## Test report format

When the Testing Agent produces a report, use this format:

```markdown
# Test Report

## Feature
<which feature>

## Changes Tested
<summary of the change>

## Automated Tests
- npm run lint: PASS / FAIL / NOT TESTED
- npm test: PASS / FAIL / NOT TESTED (N tests, N passed)

## Manual Tests
- <check>: PASS / FAIL / NOT TESTED (reason if NOT TESTED)

## Regression Checks
- <area>: PASS / FAIL

## Bugs Found
### Critical / High / Medium / Low
- <description + reproduction>

## Reproduction Steps
For each failure:
1. Preconditions
2. Steps
3. Expected result
4. Actual result
5. Logs/errors
6. Suspected code area

## Overall Result
PASS / PASS WITH WARNINGS / FAIL
```

## Review report format

The Review Agent reports findings (does NOT modify code):

```markdown
# Code Review

## Architecture
<findings>

## Feature boundaries
<were they respected? any cross-feature leaks?>

## Concurrency / race conditions
<findings>

## Documentation accuracy
<do the feature docs match the code?>

## Regressions
<any unrelated behavior changed?>

## Conventions
<follows project conventions?>

## Recommendation
APPROVE / APPROVE WITH CHANGES / REJECT
```

## Acceptance criteria — always explicit

Every non-trivial task must list acceptance criteria (the Testing Agent uses
these as a checklist). Example for a background-rotation change:

- Automatic rotation uses the Android background task.
- No foreground rotation mechanism exists.
- Manual wallpaper setting still works.
- Fixed intervals work (1h/6h/Daily/Weekly).
- Custom interval input works, min 1 minute.
- The user's configured interval is not silently changed to 15.
- Platform scheduler minimum is handled separately (documented).
- `shouldRotate()` respects elapsed time.
- `lastRotation` persists.
- `selectedNameIndex` persists.
- Notifications work per settings.
- Concurrent tasks cannot corrupt state.
