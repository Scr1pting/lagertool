import { BASE_HEIGHT, TALL_HEIGHT } from "../util/shelfUnits";


export type ShelfItemType = 'slim' | 'high';

export interface ShelfItemDefinition {
  label: string;
  unitHeight: number; // expressed in base units (0.4 ratio each)
  pixelHeight: number;
}

export interface ShelfItem {
  id: string;
  type: ShelfItemType;
  heightUnits: number;
}

export interface ShelfColumn {
  id: string;
  elements: ShelfItem[];
}

export const ITEM_CATALOG: Record<ShelfItemType, ShelfItemDefinition> = {
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
