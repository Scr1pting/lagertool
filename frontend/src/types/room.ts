import type { Building } from "./building"

export interface Room {
  id: number
  name: string
  building: Building
}
