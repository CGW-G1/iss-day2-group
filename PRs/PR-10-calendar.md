# PR-10: Monthly Calendar View

**Source:** [`PRPs/10-calendar-view.md`](../PRPs/10-calendar-view.md)  
**Priority:** P1 productivity

## Objective

Add a protected monthly calendar view that places due-dated todos on Singapore-local dates and overlays Singapore public holidays.

## Scope

- Add `holidays` table, seed script, type, and authenticated month-scoped endpoint.
- Add `generateCalendarGrid` that always returns 42 cells.
- Add `/calendar` with URL-persisted `?month=YYYY-MM`, previous/next/today navigation, and day modal.
- Render up to three priority-colored todo pills per cell and a `+X more` overflow indicator.
- Keep calendar data independent of list-view filters.

## Contract

Undated todos are excluded. Invalid month parameters fall back to the current Singapore month. Todo placement must use Singapore-local date extraction, including UTC boundary cases. Holidays are global; todos remain user-scoped.

## Implementation Surface

`lib/calendar.ts`, `lib/db.ts`, `scripts/seed-holidays.ts`, `app/api/holidays/route.ts`, `app/calendar/page.tsx`, calendar components, `middleware.ts`.

## Acceptance Checks

- [ ] `/calendar` is protected and defaults correctly.
- [ ] Navigation updates the URL and preserves fixed grid height.
- [ ] Todos appear on the correct local date and use priority colors.
- [ ] Holidays and overflow render without hiding todos.
- [ ] Day modal lists every todo for the selected date.
- [ ] Invalid months do not crash or render a blank view.

## Validation

Unit-test grid generation for leap years, weekdays, fixed size, and Singapore today. Add API tests for holiday scoping and `tests/12-calendar.spec.ts`; run lint and build.
