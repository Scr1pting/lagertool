import { type ShelfElementType } from '../../../types/shelf';

export type DragItemData =
  | { source: 'palette'; itemType: ShelfElementType }
  | { source: 'board'; columnId: string; pieceId: string };

export type DropTargetData =
  | { kind: 'column'; columnId: string }
  | { kind: 'edge'; position: 'left' | 'right' };
