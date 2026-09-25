# PR-04: Reminders and Browser Notifications

**Source:** [`PRPs/04-reminders-notifications.md`](../PRPs/04-reminders-notifications.md)  
**Priority:** P1 core

## Objective

Deliver opt-in browser notifications for due todos using seven fixed reminder offsets and server-side sent-state tracking.

## Scope

- Add `ReminderMinutes` and labels for 15m, 30m, 1h, 2h, 1d, 2d, and 1w.
- Add `GET /api/notifications/check`, scoped to the authenticated user and Singapore time.
- Reset `last_notification_sent` when due date or reminder timing changes.
- Add `useNotifications` polling every 30 seconds with permission guards and notification tags.
- Add enable-notifications control, reminder select, and reminder badge.

## Contract

A reminder is eligible when the todo is incomplete, has a due date and offset, its window has opened, and `last_notification_sent` is null. Browser delivery is best effort across multiple tabs; the server flag prevents repeat polling after a successful stamp.

## Implementation Surface

`lib/db.ts`, `lib/timezone.ts`, `lib/hooks/useNotifications.ts`, `app/api/notifications/check/route.ts`, todo update route, `app/page.tsx`.

## Acceptance Checks

- [ ] Permission is requested only from explicit user action.
- [ ] Reminder selection is disabled without a due date.
- [ ] The check endpoint returns only eligible current-user todos.
- [ ] Editing due date or reminder re-arms the reminder.
- [ ] All seven labels and badge values are correct.
- [ ] Polling stops when permission is not granted or is revoked.

## Validation

Unit-test exact window boundaries for all offsets. Add API tests for sent-state exclusion and reset behavior, Playwright coverage in `tests/06-reminders.spec.ts`, and a documented manual browser-notification check.
