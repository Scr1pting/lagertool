# Backend TODO — Missing Endpoints

Endpoints the frontend calls but the backend does not implement.
Verified against `backend/api/routes.go` and frontend `fetch` hooks under `frontend/src/hooks/fetch/`.

## Missing

### `GET /borrow_requests`

Called by:
- `frontend/src/hooks/fetch/useFetchBorrowRequestsAdmin.ts:5` — consumed by `frontend/src/pages/BorrowRequests.tsx:8` (admin view: all requests across the org)
- `frontend/src/hooks/fetch/useFetchBorrowRequestsPersonal.ts:5` — consumed by `frontend/src/pages/Account.tsx:10` (per-user view: only the signed-in user's requests)

Expected response shape: `BorrowRequest[]` — see `frontend/src/types/borrowRequest.ts:22`:

```ts
interface BorrowRequest {
  id: number
  approvalState: "pending" | "approved" | "rejected"
  timeState?: "future" | "onLoan" | "overdue" | "returned"
  title: string
  author: string
  description?: string
  creationDate: Date
  startDate: Date
  endDate: Date
  returnedDate?: Date
  items: BorrowItem[]       // InventoryItem + { borrowed: number }
  messages: Message[]       // { id, text, author, admin }
}
```

Notes:
- Two hooks (`Admin` vs `Personal`) currently hit the same URL. Decide whether the backend should:
  - (a) expose **one** endpoint that scopes by the authenticated user's role, or
  - (b) split into `GET /borrow_requests` (admin/all) and `GET /borrow_requests/mine` (personal),
    and update the personal hook accordingly.
- Existing related routes are scoped under `/requests/:id/...` (see `backend/api/routes.go:48-53`). Consider whether the list endpoint should live at `/requests` instead of `/borrow_requests` for consistency — if so, update the frontend hooks to match rather than adding a divergent path on the backend.
- The response must inline `items` (with per-item `borrowed` amount) and `messages`, since the frontend renders both from the list payload without follow-up fetches (see `frontend/src/components/BorrowRequests/RequestDetail.tsx`).

## Not missing, but worth noting

All other frontend `fetch` calls resolve to a backend route in `backend/api/routes.go`. Several backend endpoints exist with **no** frontend caller yet (cart mutations, item update, building/room creation, request review, loan updates, message posting) — those are frontend gaps, not backend gaps, so they are out of scope for this file.
