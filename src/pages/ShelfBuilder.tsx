import { useCallback, useMemo, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragCancelEvent,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';

import { Palette, Canvas } from '../features/shelves/';
import {
  ITEM_CATALOG,
  type ShelfColumn,
  type ShelfItem,
  type ShelfItemType,
} from '../features/shelves/types/shelf';
import { type DragItemData, type DropTargetData } from '../features/shelves/types/drag';
import { MAX_STACK_UNITS } from '../features/shelves/util/shelfUnits';
import { makeId } from '../features/shelves/util/ids';
import { ShelfPieceInner } from '../features/shelves/components/ShelfPiece';

import styles from './ShelfBuilder.module.css';
import ActionBar from '@/features/shelves/components/ActionBar';


const totalUnits = (elements: ShelfItem[]) => elements.reduce((sum, piece) => sum + piece.heightUnits, 0);

const createColumn = (elements: ShelfItem[] = []): ShelfColumn => ({
  id: `column-${makeId()}`,
  elements,
});


const placePiece = (
  columns: ShelfColumn[],
  piece: ShelfItem,
  target: DropTargetData
): ShelfColumn[] | null => {
  if (target.kind === 'edge') {
    const freshColumn = createColumn([piece]);
    return target.position === 'left' ? [freshColumn, ...columns] : [...columns, freshColumn];
  } else {
    const nextColumns: ShelfColumn[] = [];
    let placed = false;

    for (const column of columns) {
      if (column.id !== target.columnId) {
        nextColumns.push(column);
        continue;
      }

      if (MAX_STACK_UNITS - totalUnits(column.elements) < piece.heightUnits) {
        return null;
      }

      nextColumns.push({
        ...column,
        elements: [piece, ...column.elements],
      });
      placed = true;
    }

    return placed ? nextColumns : null;
  }
};

const ShelfBuilder = () => {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    })
  );

  const [columns, setColumns] = useState<ShelfColumn[]>([]);
  const [activeDrag, setActiveDrag] = useState<DragItemData | null>(null);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const data = event.active.data.current as DragItemData | undefined;
    if (!data) {
      setActiveDrag(null);
    } else {
      setActiveDrag(data);
    }
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const activeData = event.active.data.current as DragItemData | undefined;
      const overData = event.over?.data.current as DropTargetData | undefined;

      setActiveDrag(null);

      if (!activeData) {
        return;
      }

      // Remove elements that are moved outside the drag area
      if (!overData) {
        if (activeData.source === 'board') {
          setColumns((previousColumns) => {
            return previousColumns
              .map((column) => ({
                ...column,
                elements: column.elements.filter((element) => element.id !== activeData.pieceId),
              }))
              .filter((column) => column.elements.length > 0); // Also remove empty columns
          });
        }
        return;
      }

      // Handle moving elements from the palette into the canvas
      if (activeData.source === 'palette') {
        const definition = ITEM_CATALOG[activeData.itemType];
        const newPiece: ShelfItem = {
          id: makeId(),
          type: activeData.itemType,
          heightUnits: definition.unitHeight,
        };

        setColumns((previousColumns) => {
          const nextColumns = placePiece(previousColumns, newPiece, overData);
          if (!nextColumns) {
            return previousColumns;
          }
          return nextColumns;
        });
        return;
      
      // Handle moving elements from one position to another
      } else {
        setColumns((previousColumns) => {
          const originColumnIndex = previousColumns.findIndex(
            (column) => column.id === activeData.columnId
          );
          if (originColumnIndex === -1) {
            return previousColumns;
          }

          const originColumn = previousColumns[originColumnIndex];
          const elementIndex = originColumn.elements.findIndex(
            (element) => element.id === activeData.pieceId
          );
          if (elementIndex === -1) {
            return previousColumns;
          }

          const movingPiece = originColumn.elements[elementIndex];
          const columnsWithoutPiece = previousColumns.map((column, index) =>
            index === originColumnIndex
              ? { ...column, elements: column.elements.filter((element) => element.id !== movingPiece.id) }
              : column
          );

          const nextColumns = placePiece(columnsWithoutPiece, movingPiece, overData);
          return nextColumns?.filter((column) => column.elements.length > 0) ?? previousColumns;
        });
      }
    },
    []
  );

  const handleDragCancel = useCallback((_: DragCancelEvent) => {
    setActiveDrag(null);
  }, []);
  
  const overlayNode = useMemo(() => {
    if (!activeDrag) {
      return null;
    }

    const resolveType = (): ShelfItemType | null => {
      if (activeDrag.source === 'palette') {
        return activeDrag.itemType;
      }

      const column = columns.find((candidate) => candidate.id === activeDrag.columnId);
      const piece = column?.elements.find((candidate) => candidate.id === activeDrag.pieceId);
      return piece?.type ?? null;
    };

    const pieceType = resolveType();
    if (!pieceType) {
      return null;
    }
    
    return (
      <ShelfPieceInner itemDef={ITEM_CATALOG[pieceType]} />
    );
  }, [activeDrag, columns]);

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
  <ActionBar columns={columns} />

      <div className={styles.wrapper}>
        <Palette />
        <Canvas columns={columns} />
      </div>

      <DragOverlay dropAnimation={null}>{overlayNode}</DragOverlay>
    </DndContext>
  );
};

export default ShelfBuilder;
