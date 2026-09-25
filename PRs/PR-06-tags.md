# PR-06: User-Owned Tag System

**Source:** [`PRPs/06-tag-system.md`](../PRPs/06-tag-system.md)  
**Priority:** P1 organization

## Objective

Provide user-owned color tags with many-to-many todo associations, management UI, and tag filtering.

## Scope

- Add `tags` and `todo_tags` with user-scoped uniqueness and cascades.
- Add tag CRUD plus idempotent attach/detach routes.
- Validate trimmed names and six-digit hex colors; map duplicate names to `409`.
- Add manage-tags modal, selectable pills, todo badges, and tag filter.
- Reset an active tag filter if that tag is deleted.

## Contract

All tag queries include `session.userId`. Same names are allowed across users but not within one user's tag set. Cross-user access returns `404`. Attaching an attached tag and detaching an absent tag are successful no-ops.

## Implementation Surface

`lib/db.ts`, tag API routes, todo/tag relation queries, `app/page.tsx`, shared tag components.

## Acceptance Checks

- [ ] Tag create, edit, delete, attach, and detach work.
- [ ] Colors and names validate at the API boundary.
- [ ] Deletion removes all links without affecting unrelated todos.
- [ ] Multiple tags render on one todo and filter correctly.
- [ ] Tag ownership is enforced on every read and write.

## Validation

Unit-test validation, uniqueness, idempotency, and cascades. Add Playwright coverage in `tests/08-tags.spec.ts`; run lint and build.
