# Business Flow Validation Matrix

## Legend
- Implemented: business rule is present in code.
- Automated: covered by automated tests.
- Manual: covered by manual checklist.
- Gap: missing implementation or validation.

## Authentication and Permissions
| Flow | Implemented | Automated | Manual | Gap |
| --- | --- | --- | --- | --- |
| Login success and failure | Yes | Partial | Planned | Add AuthContext integration tests |
| Route protected for unauthenticated user | Yes | Yes | Planned | - |
| Role-based access control | Yes | Yes | Planned | Add scenario for gestor-specific routes |
| Logout flow | Yes | No | Planned | Add test in AuthContext |
| Change password flow | Yes | No | Planned | Add happy path and error path tests |

## Finance and Financial Documents
| Flow | Implemented | Automated | Manual | Gap |
| --- | --- | --- | --- | --- |
| Create transaction | Yes | Yes (local fallback) | Planned | Add Firebase path tests with emulator |
| Update transaction status | Yes | Yes (local fallback) | Planned | Add approval status transition tests |
| List and filter transactions | Yes | Partial | Planned | Add filter coverage by value/date/type |
| Create invoice (nota fiscal) | Yes | Yes (local fallback) | Planned | Add timeout and Firebase upload tests |
| List and filter invoices | Yes | Yes (search) | Planned | Add status/date filters tests |

## Notifications
| Flow | Implemented | Automated | Manual | Gap |
| --- | --- | --- | --- | --- |
| Create notification | Yes | No | Planned | Add unit test for create and side effect email call |
| List/filter notifications | Yes | No | Planned | Add query and fallback index tests |
| Mark single as read | Yes | No | Planned | Add update behavior test |
| Mark all as read | Yes | No | Planned | Add batch path and fallback path tests |
| Notification stats | Yes | Yes | Planned | Add coverage for all notification types |

## Sprint Goal (Current Iteration)
- Stabilize test harness and run in CI-like mode with `npm run test`.
- Reach baseline coverage for core rules in auth/permissions, finance/documents, and notifications.
- Keep manual checklist aligned with automated evidence.
