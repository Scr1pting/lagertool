import { useDraggable } from '@dnd-kit/core';
import { motion } from 'framer-motion';
import { type CSSProperties, type HTMLAttributes, type ReactNode } from 'react';

import { type ShelfElementDefinition } from '../../../types/shelf';
import { type DragItemData } from '../types/drag';

import styles from './ShelfElementView.module.css';
import { ELEMENT_WIDTH, SHORT_HEIGHT, TALL_HEIGHT } from '../util/shelfUnits';


export function ShelfElementViewInner(
  { itemDef, children }:
  { itemDef: ShelfElementDefinition, children?: ReactNode }
) {
  return (
    <div
      className={styles.element}
      style={{
          width: ELEMENT_WIDTH,
          height: itemDef.heightUnits == 1 ? SHORT_HEIGHT : TALL_HEIGHT,
          pointerEvents: 'none',
      }}
    >
      {children}
    </div>
  )
}


interface ShelfPieceProps extends HTMLAttributes<HTMLDivElement> {
  itemDef: ShelfElementDefinition,
  draggableId: string;
  dragData: DragItemData;
}

function ShelfElementView({
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

  const combinedClassName = [incomingClassName, styles.pieceWrapper, isDragging ? styles.elementDragging : ""]
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
        <ShelfElementViewInner itemDef={itemDef} />
      </div>
    </motion.div>
  );
};

export default ShelfElementView;
