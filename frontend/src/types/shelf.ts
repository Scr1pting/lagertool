import type { Building } from "./building";
import type { Room } from "./room";

export type ShelfElementType = 'slim' | 'high';


export interface ShelfElementDefinition {
  label: string;
  heightUnits: number;  // expressed in base units (0.4 ratio each)
}

export interface ShelfElement {
  id: string  // string for simpler element labels
  type: ShelfElementType
}

export interface ShelfColumn {
  id: string;
  elements: ShelfElement[];
}

export interface Shelf {
  id: string
  name: string
  displayName: string
  room: Room
  building: Building
  columns: ShelfColumn[]
}

export const ELEMENT_CATALOG: Record<ShelfElementType, ShelfElementDefinition> = {
  slim: {
    label: 'Short Element',
    heightUnits: 1,
  },
  high: {
    label: 'Tall Element',
    heightUnits: 2,
  },
};
