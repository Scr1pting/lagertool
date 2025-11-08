import type { ReactNode } from "react"

export interface ManageInventoryElement {
  size: "full" | "half"
  label: string
  id: string
  input: ReactNode
}
