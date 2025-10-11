import { type ShelfItemType } from './shelf';

export type DragItemData =
  | { source: 'palette'; itemType: ShelfItemType }
  | { source: 'board'; columnId: string; pieceId: string };

export type DropTargetData =
  | { kind: 'column'; columnId: string }
  | { kind: 'edge'; position: 'left' | 'right' };
