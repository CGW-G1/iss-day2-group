# PR-08: Search, Filtering, and Saved Presets

**Source:** [`PRPs/08-search-filtering.md`](../PRPs/08-search-filtering.md)  
**Priority:** P1 organization

## Objective

Make the in-memory todo list quickly searchable and filterable across title, subtasks, priority, tags, completion state, and due-date ranges.

## Scope

- Add immutable `FilterState`, defaults, and `hasActiveFilters`.
- Add debounced title/subtask search with immediate clear behavior.
- Apply filters in the required order: search, priority, tag, completion, date range.
- Add advanced controls, post-filter section counts, and hide empty sections.
- Persist named filter presets in browser `localStorage`.

## Contract

Filtering is client-side against the authenticated user's already-loaded `Todo[]`; no new API or database table is needed. All dimensions combine with AND logic. A date-range filter excludes undated todos.

## Implementation Surface

`lib/filters.ts`, `lib/hooks/useDebounce.ts`, `app/page.tsx`, filter/preset components.

## Acceptance Checks

- [ ] Search is case-insensitive and matches todo or subtask titles.
- [ ] Each filter works alone and in combination.
- [ ] Counts reflect filtered results and empty sections disappear.
- [ ] Presets survive refresh, can be applied, and can be deleted.
- [ ] Malformed local storage falls back to empty presets without breaking the page.

## Validation

Unit-test exact filter order, AND behavior, date boundaries, and preset persistence. Add Playwright coverage in `tests/10-search-filtering.spec.ts`; run lint and build.
