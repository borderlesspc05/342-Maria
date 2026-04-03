# Manual Checklist - Business Flows

## Preconditions
1. App running with valid .env.
2. At least one user per role: admin, gestor, colaborador.
3. Seed data available for finance and notifications.

## Authentication and Permissions
1. Login with valid credentials redirects to dashboard.
2. Login with invalid credentials shows error message.
3. Unauthenticated access to private route redirects to login.
4. Colaborador cannot access admin-only pages.
5. Admin can access admin-only pages.
6. Logout returns user to login and blocks private pages.

## Finance and Financial Documents
1. Create a new transaction and verify default status is Pendente.
2. Approve transaction and verify fields aprovadoPor/aprovadoEm.
3. Mark transaction as Pago and verify paid fields and receipt number.
4. Filter transactions by status, date range, category, and amount.
5. Create nota fiscal with attachment and verify status pendente.
6. Search nota fiscal by number and supplier name.
7. Update nota fiscal status to aprovado and reject with note.

## Notifications
1. Create notification and verify appears for target user.
2. Filter notifications by tipo and prioridade.
3. Mark one notification as read and verify lidoEm set.
4. Mark all unread notifications as read.
5. Verify stats counters for total and unread.
6. Delete read notifications and verify list refresh.

## Evidence
- Record date, tester, user role, and result (Pass/Fail).
- For Fail cases, include reproduction steps and expected/actual behavior.
