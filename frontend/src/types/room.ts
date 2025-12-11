import type { Building } from "./building"

export interface Room {
  id: number
  name: string
  number: string
  building: Building
}
