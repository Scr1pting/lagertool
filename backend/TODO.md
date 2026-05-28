# Backend TODO — Missing Endpoints

Endpoints the frontend calls but the backend does not implement.
Verified against `backend/api/routes.go` and frontend `fetch` hooks under `frontend/src/hooks/fetch/`.

## Missing

_(none — all frontend `fetch` calls currently resolve to a backend route)_

## Recently resolved

- `GET /borrow_requests` — handler `GetBorrowRequests` in `backend/api/handlers.go`, route registered in `backend/api/routes.go`, tests in `backend/api/handlers_test.go::TestGetBorrowRequests`. Admin scope returns all requests; `?userId=N` filters to a single user. Frontend hooks (`useFetchBorrowRequestsAdmin.ts`, `useFetchBorrowRequestsPersonal.ts`) updated accordingly.

## Follow-ups (not blocking the frontend)

- The personal-scope `userId` is currently a query parameter (and hard-coded to `1` in `useFetchBorrowRequestsPersonal.ts`, mirroring `useFetchCart.ts`). Once auth context is plumbed into the frontend, switch the personal scope to derive the user from the session and consider scoping admin results by `has_special_rights_for`.
- Several backend endpoints exist with **no** frontend caller yet (cart mutations, item update, building/room creation, request review, loan updates, message posting). Those are frontend gaps, not backend gaps, so they are out of scope for this file.
