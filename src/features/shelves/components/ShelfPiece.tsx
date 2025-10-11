import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import type { CSSProperties, HTMLAttributes } from 'react';

import { type ShelfItemDefinition } from '../types/shelf';
import { type DragItemData } from '../types/drag';

import styles from './ShelfPiece.module.css';
import { ELEMENT_WIDTH } from '../util/shelfUnits';


export function ShelfPieceInner({ itemDef }: { itemDef: ShelfItemDefinition }) {
  return (
    <div
      className={styles.piece}
      aria-label={itemDef.label}
      style={{
          width: ELEMENT_WIDTH,
          height: itemDef.pixelHeight,
          pointerEvents: 'none',
      }}
    />
  )
}


interface ShelfPieceProps extends HTMLAttributes<HTMLDivElement> {
  itemDef: ShelfItemDefinition,
  draggableId: string;
  dragData: DragItemData;
  applyTransform?: boolean;
}


function ShelfPiece({
  itemDef,
  draggableId,
  dragData,
  applyTransform = true,
  ...divProps
}: ShelfPieceProps) {
  const { attributes, listeners, setNodeRef, isDragging, transform } = useDraggable({
    id: draggableId,
    data: dragData,
  });

  const { style, className: incomingClassName, ...restDivProps } = divProps;
  const combinedStyle: CSSProperties = { ...(style ?? {}) };

  if (applyTransform && transform) {
    combinedStyle.transform = CSS.Transform.toString(transform);
  }

  const combinedClassName = [incomingClassName, styles.pieceWrapper, isDragging ? styles.pieceDragging : ""]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={combinedStyle}
      className={combinedClassName}
      {...restDivProps}
    >
      <ShelfPieceInner itemDef={itemDef} />
    </div>
  );
};

export default ShelfPiece;
