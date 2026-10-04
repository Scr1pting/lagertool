import axios from "axios"

// The backend's 409 when a checkout asks for more than is free in its period.
export interface UnavailableItem {
  id: number
  name: string
  requested: number
  available: number
}

// The unavailable items if err is that 409, otherwise null.
export function unavailableItemsOf(err: unknown): UnavailableItem[] | null {
  if (!axios.isAxiosError(err) || err.response?.status !== 409) return null
  const items = err.response.data?.items
  return Array.isArray(items) ? items : null
}

export function describeUnavailable(item: UnavailableItem): string {
  return item.available > 0
    ? `${item.name}: only ${item.available} of ${item.requested} available`
    : `${item.name}: none available`
}

// The error message of a failed request, like the api helpers produce.
export function errorMessage(err: unknown): string | undefined {
  if (axios.isAxiosError(err)) return err.response?.data?.error ?? err.message
  return err instanceof Error ? err.message : undefined
}
