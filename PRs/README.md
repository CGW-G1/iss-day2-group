# Core Feature Pull Request Documents

These documents translate the 11 feature PRPs in [`../PRPs/`](../PRPs/) into implementation-ready pull request briefs. Each brief defines the scope, dependency boundary, principal files, acceptance checks, and test plan for one feature.

## Delivery Order

| PR | Feature | Phase | Depends on |
|---|---|---|---|
| [PR-01](PR-01-todo-crud.md) | Todo CRUD | Foundation | None |
| [PR-02](PR-02-priority.md) | Priority system | Foundation | PR-01 |
| [PR-03](PR-03-recurring-todos.md) | Recurring todos | Core | PR-01, PR-02, PR-04, PR-06 |
| [PR-04](PR-04-reminders.md) | Reminders and notifications | Core | PR-01 |
| [PR-05](PR-05-subtasks.md) | Subtasks and progress | Core | PR-01 |
| [PR-06](PR-06-tags.md) | Tag system | Organization | PR-01 |
| [PR-07](PR-07-templates.md) | Template system | Productivity | PR-01, PR-02, PR-03, PR-04, PR-05 |
| [PR-08](PR-08-search-filtering.md) | Search and filtering | Organization | PR-01, PR-02, PR-05, PR-06 |
| [PR-09](PR-09-export-import.md) | Export and import | Productivity | PR-01, PR-05, PR-06 |
| [PR-10](PR-10-calendar.md) | Calendar view | Productivity | PR-01, PR-02, PR-11 |
| [PR-11](PR-11-authentication.md) | WebAuthn authentication | Infrastructure | None, required by all protected routes |

## Common Review Checklist

- [ ] All protected routes call `getSession()` before reading or mutating data.
- [ ] Every query is scoped to `session.userId` where data is user-owned.
- [ ] Singapore timezone helpers are used for date and time calculations.
- [ ] SQLite writes use prepared statements and transactions where multiple rows change.
- [ ] Inputs are validated at the API boundary; errors do not leak implementation details.
- [ ] Unit, integration, and Playwright coverage is added for the feature's acceptance criteria.
- [ ] `npm run lint` and `npm run build` pass.

The source of truth for detailed contracts remains the corresponding PRP in [`../PRPs/`](../PRPs/).
