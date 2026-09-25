# PR-07: Reusable Todo Templates

**Source:** [`PRPs/07-template-system.md`](../PRPs/07-template-system.md)  
**Priority:** P1 productivity

## Objective

Save todo patterns as user-owned templates and instantiate fresh todos, including unchecked subtasks, from a quick action or manager.

## Scope

- Add the user-scoped `templates` table and types.
- Add template list/create/update/delete/use routes.
- Serialize subtask definitions to JSON and parse defensively on use.
- Store only a relative due-date offset; never store concrete due dates or tags.
- Add Save Template modal, Use Template control, and manager UI.
- Reject recurring templates without a due-date offset to preserve recurrence invariants.

## Contract

Templates are snapshots. Editing/deleting a template never changes existing todos. Names need not be unique. Template use creates a new todo and subtasks in one operation, resolving offsets with Singapore time.

## Implementation Surface

`lib/db.ts`, `lib/timezone.ts`, template API routes, `app/page.tsx`, template UI components.

## Acceptance Checks

- [ ] Required name/title validation works.
- [ ] Priority, recurrence, reminder, and subtask definitions round-trip.
- [ ] Using a template creates a fresh todo with new IDs and unchecked subtasks.
- [ ] Due-date offsets are calculated at use time.
- [ ] Tags are not copied and prior todos are unaffected by template deletion.
- [ ] User A cannot view or use User B's templates.

## Validation

Unit-test JSON round trips, malformed JSON fallback, and offset arithmetic. Add `tests/09-templates.spec.ts`; run lint and build.
