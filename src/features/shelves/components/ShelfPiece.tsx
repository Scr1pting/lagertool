import { useDraggable } from '@dnd-kit/core';
import { motion } from 'framer-motion';
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
}


function ShelfPiece({
  itemDef,
  draggableId,
  dragData,
  ...divProps
}: ShelfPieceProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: draggableId,
    data: dragData,
  });

  const { style, className: incomingClassName, ...restDivProps } = divProps;
  const combinedStyle: CSSProperties = { ...(style ?? {}) };

  const combinedClassName = [incomingClassName, styles.pieceWrapper, isDragging ? styles.pieceDragging : ""]
    .filter(Boolean)
    .join(' ');

  return (
    <motion.div
      layout
      transition={{ duration: 0.2, ease: 'easeOut' }}
      style={combinedStyle}
      className={combinedClassName}
    >
      <div
        ref={setNodeRef}
        {...listeners}
        {...attributes}
        {...restDivProps}
        style={{ width: '100%', height: '100%' }}
      >
        <ShelfPieceInner itemDef={itemDef} />
      </div>
    </motion.div>
  );
};

export default ShelfPiece;
