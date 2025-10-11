import { BASE_HEIGHT, TALL_HEIGHT } from "../util/shelfUnits";


export type ShelfElementType = 'slim' | 'high';

export interface ShelfElementDefinition {
  label: string;
  unitHeight: number; // expressed in base units (0.4 ratio each)
  pixelHeight: number;
}

export interface ShelfElement {
  id: string;
  type: ShelfElementType;
  heightUnits: number;
}

export interface ShelfColumn {
  id: string;
  elements: ShelfElement[];
}

export const ELEMENT_CATALOG: Record<ShelfElementType, ShelfElementDefinition> = {
  slim: {
    label: 'Narrow Shelf',
    unitHeight: 1,
    pixelHeight: BASE_HEIGHT,
  },
  high: {
    label: 'High Shelf',
    unitHeight: 2,
    pixelHeight: TALL_HEIGHT,
  },
};
