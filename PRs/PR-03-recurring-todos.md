# PR-03: Recurring Todos

**Source:** [`PRPs/03-recurring-todos.md`](../PRPs/03-recurring-todos.md)  
**Priority:** P0 core

## Objective

Allow a todo to repeat daily, weekly, monthly, or yearly. Completing an active recurring instance atomically creates exactly one next instance with inherited metadata.

## Scope

- Validate `is_recurring`, `recurrence_pattern`, and the required due date.
- Add Singapore-local date arithmetic in `lib/recurrence.ts`.
- Extend the completion path to create the next instance in the same transaction/request.
- Copy title, priority, recurrence, reminder, and tag associations; reset completion and notification state.
- Add recurrence controls and a visible pattern badge.
- Prevent duplicate creation when a completion request is repeated.

## Contract

Monthly dates clamp to the final valid day of the target month; Feb 29 clamps to Feb 28 in a non-leap year. Disabling recurrence affects only the edited instance and does not alter already-created instances.

## Implementation Surface

`lib/recurrence.ts`, `lib/timezone.ts`, `lib/db.ts`, `app/api/todos/[id]/route.ts`, `app/page.tsx`, tag persistence helpers.

## Acceptance Checks

- [ ] Invalid patterns and recurring todos without due dates return `400`.
- [ ] Each pattern computes the correct next due date and preserves time of day.
- [ ] Completion creates one incomplete next instance with inherited metadata.
- [ ] Tag and reminder inheritance works.
- [ ] Double completion does not duplicate the next instance.
- [ ] Turning recurrence off stops future creation.

## Validation

Unit-test all date boundary cases, including Jan 31 and Feb 29. Add API integration tests for atomic completion and duplicate protection, plus `tests/05-recurring-todos.spec.ts`. Run lint and build.
