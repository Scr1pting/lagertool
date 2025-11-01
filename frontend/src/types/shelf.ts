export type ShelfElementType = 'slim' | 'high';


export interface ShelfElementDefinition {
  label: string;
  heightUnits: number;  // expressed in base units (0.4 ratio each)
}

export interface ShelfElement {
  id: string;
  type: ShelfElementType;
  numItems?: number;
}

export interface ShelfColumn {
  id: string;
  elements: ShelfElement[];
}

export interface Shelf {
  id: string;
  name: string;
  roomName: string;
  buildingName: string;
  columns: ShelfColumn[];
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
