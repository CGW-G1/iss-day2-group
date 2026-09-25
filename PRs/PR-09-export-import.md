# PR-09: JSON and CSV Export/Import

**Source:** [`PRPs/09-export-import.md`](../PRPs/09-export-import.md)  
**Priority:** P1 productivity

## Objective

Provide full-fidelity JSON backup/restore and flattened RFC 4180 CSV export for the current user's todos.

## Scope

- Add authenticated `GET /api/todos/export?format=json|csv`.
- Add authenticated transactional `POST /api/todos/import`.
- Version and validate the JSON envelope with a strict schema.
- Export and import nested subtasks, tags, and relationships while assigning new IDs.
- Reuse same-named tags case-insensitively; preserve the existing tag color on reuse.
- Add toolbar download/import controls and clear success/error feedback.

## Contract

JSON is re-importable; CSV is one-way. Import never merges or overwrites todos. Invalid input causes no writes. A valid empty array succeeds with zero imported items. All dates and filenames use Singapore time.

## Implementation Surface

`lib/export.ts`, `lib/db.ts`, `app/api/todos/export/route.ts`, `app/api/todos/import/route.ts`, `app/page.tsx`.

## Acceptance Checks

- [ ] JSON contains version, timestamp, todos, subtasks, and tags.
- [ ] CSV uses fixed columns and RFC 4180 escaping.
- [ ] Imports assign new IDs and preserve relationships and ordering.
- [ ] Tag conflicts reuse existing user-owned tags.
- [ ] Any failure rolls back the entire import.
- [ ] Unauthenticated requests return `401`.

## Validation

Unit-test schema validation, CSV escaping, ID remapping, tag resolution, and transaction rollback. Add `tests/11-export-import.spec.ts`; run lint and build.
