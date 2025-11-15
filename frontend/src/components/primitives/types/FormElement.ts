import type { ReactNode } from "react"

export interface FormElement {
  size: "full" | "half"
  label: string
  id: string
  input: ReactNode
}
