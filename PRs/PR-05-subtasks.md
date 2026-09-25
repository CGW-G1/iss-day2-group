# PR-05: Subtasks and Progress Tracking

**Source:** [`PRPs/05-subtasks-progress.md`](../PRPs/05-subtasks-progress.md)  
**Priority:** P1 core

## Objective

Add ordered checklists under todos with independent completion state and a progress summary that remains visible when the checklist is collapsed.

## Scope

- Add `subtasks` with `ON DELETE CASCADE`, indexes, and `Subtask` types.
- Add authenticated create, update, and delete routes for subtasks.
- Assign new positions as `MAX(position) + 1`; do not renumber after deletion.
- Add `calculateProgress` as a pure shared helper.
- Add expandable checklist UI with optimistic checkbox updates and progress bar.

## Contract

Subtasks never change the parent todo's completed state. Empty titles are rejected with `400`. Cross-user access returns `404`. A zero-subtask todo has no progress bar; 100% completion is green, otherwise progress is blue.

## Implementation Surface

`lib/db.ts`, `lib/progress.ts`, `app/api/todos/[id]/subtasks/route.ts`, `app/api/subtasks/[id]/route.ts`, `app/page.tsx`.

## Acceptance Checks

- [ ] Add, toggle, rename, and delete operations work independently.
- [ ] Progress count and percentage update after every mutation.
- [ ] Position ordering is stable and deletion leaves harmless gaps.
- [ ] Parent deletion removes all subtasks.
- [ ] Ownership checks protect every subtask route.
- [ ] Subtask titles participate in search.

## Validation

Unit-test progress rounding and zero/partial/full cases. Add route integration tests for positions, cascade, and ownership; add `tests/07-subtasks.spec.ts`. Run lint and build.
