# PR-01: Todo CRUD and List Organization

**Source:** [`PRPs/01-todo-crud-operations.md`](../PRPs/01-todo-crud-operations.md)  
**Priority:** P0 foundation

## Objective

Implement authenticated create, read, update, complete, and delete operations for todos. The main list must organize incomplete items into Overdue and Pending sections, with Completed items shown separately.

## Scope

- Add the `todos` table and `Todo`, `CreateTodoInput`, and `UpdateTodoInput` types in `lib/db.ts`.
- Add `todoDB` CRUD methods using prepared statements and user ownership checks.
- Add `POST`/`GET /api/todos` and `PUT`/`DELETE /api/todos/[id]`.
- Add the main client workflow in `app/page.tsx`, including optimistic create, completion toggle, edit, delete, rollback, and error feedback.
- Add Singapore-aware validation for due dates and deterministic sorting/sectioning.
- Enable SQLite foreign keys so future subtasks and tag links cascade on deletion.

## Contract

- Title is required after trimming.
- Optional due dates must be at least one minute in the future when created or changed.
- All routes return `401` without a session and `404` for records outside the current user.
- Delete is immediate and cascades related rows through SQLite foreign keys.
- Sort priority is high to low, then due date ascending, then newest creation date; completed items use newest update time first.

## Implementation Surface

`lib/db.ts`, `lib/timezone.ts`, `lib/todoSort.ts`, `app/page.tsx`, `app/api/todos/route.ts`, `app/api/todos/[id]/route.ts`.

## Acceptance Checks

- [ ] A user can create, edit, complete/uncomplete, and delete a todo.
- [ ] Empty titles return `400` and do not write.
- [ ] Overdue, Pending, and Completed sections and counts update immediately.
- [ ] Optimistic failures restore the previous client state.
- [ ] Cross-user reads and writes return `404`.
- [ ] Due-date calculations use `Asia/Singapore`.

## Validation

Add unit tests for validation, sorting, and sectioning; API integration tests for ownership and cascade behavior; Playwright coverage in `tests/02-todo-crud.spec.ts`. Run `npm run lint`, `npm run build`, and the focused Playwright suite.
