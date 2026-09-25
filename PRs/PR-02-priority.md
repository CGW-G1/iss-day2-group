# PR-02: Priority System

**Source:** [`PRPs/02-priority-system.md`](../PRPs/02-priority-system.md)  
**Priority:** P0 foundation

## Objective

Add high, medium, and low priority as a required, validated todo attribute with visual badges, deterministic ordering, and a list filter.

## Scope

- Define `Priority`, `PRIORITY_VALUES`, and `PRIORITY_ORDER` in `lib/db.ts`.
- Validate priority on todo create and update; default omitted create values to `medium`.
- Extend list sorting without mutating input arrays.
- Add priority controls to create/edit forms, `PriorityBadge`, and the priority filter.
- Ensure recurring instances inherit priority.

## Contract

Valid values are lowercase `high`, `medium`, and `low`. Invalid values return `400`; priority is never nullable in storage. Overdue and Pending sort high to low, then earliest due date and newest creation date. Completed ordering remains completion-time based.

## Implementation Surface

`lib/db.ts`, `lib/todoSort.ts`, `app/api/todos/route.ts`, `app/api/todos/[id]/route.ts`, `app/page.tsx`, shared priority UI components.

## Acceptance Checks

- [ ] Omitted create priority becomes Medium.
- [ ] Invalid or uppercase values are rejected without a write.
- [ ] Badges render correctly in all sections and themes.
- [ ] Editing priority immediately changes placement and filtered visibility.
- [ ] Priority combines with search, tag, completion, and date filters using AND logic.

## Validation

Add unit coverage for `validatePriority` and `compareTodos`; add Playwright coverage in `tests/03-priority.spec.ts`. Run the focused test suite plus lint and build.
