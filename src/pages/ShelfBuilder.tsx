import { type CSSProperties, type RefObject, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import styles from './ShelfBuilder.module.css';

// === Constants ===
const SHELF_WIDTH = 160;
const BASE_HEIGHT = SHELF_WIDTH * 0.4; // 0.4:1 ratio
const TALL_HEIGHT = SHELF_WIDTH * 0.8; // 0.8:1 ratio
const COLUMN_GAP = 0;
const MAX_STACK_UNITS = 6; // expressed in base-height units (0.4 ratio each)
const POOF_DURATION_MS = 260;
const BORDER_FULL = 1;
const BORDER_HALF = BORDER_FULL / 2;

// === Types ===
type ShelfItemType = 'narrow' | 'high';

interface ShelfItemDefinition {
  label: string;
  description: string;
  unitHeight: number; // expressed in base units (0.4 ratio each)
  pixelHeight: number;
}

interface ShelfItem {
  id: string;
  type: ShelfItemType;
  heightUnits: number;
}

interface ShelfColumn {
  id: string;
  pieces: ShelfItem[];
}

interface PieceRange {
  id: string;
  bottom: number;
  top: number;
}

type DragPayload =
  | { kind: 'palette'; itemType: ShelfItemType }
  | { kind: 'board'; columnIndex: number; pieceId: string; itemType: ShelfItemType };

type DropZoneStyle = CSSProperties & {
  '--unit-width': string;
  '--unit-base-height': string;
  '--content-width': string;
};

// === Catalog Definitions ===
const ITEM_CATALOG: Record<ShelfItemType, ShelfItemDefinition> = {
  narrow: {
    label: 'Narrow Shelf',
    description: 'Height to width ratio 0.4 : 1',
    unitHeight: 1,
    pixelHeight: BASE_HEIGHT,
  },
  high: {
    label: 'High Shelf',
    description: 'Height to width ratio 0.8 : 1',
    unitHeight: 2,
    pixelHeight: TALL_HEIGHT,
  },
};

// === Utilities ===
const makeId = (): string =>
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `piece-${Math.random().toString(36).slice(2, 10)}`;

const totalUnits = (pieces: ShelfItem[]): number =>
  pieces.reduce((sum, piece) => sum + piece.heightUnits, 0);

// === Subcomponents ===
interface PaletteProps {
  onDragStart: (type: ShelfItemType) => (event: React.DragEvent<HTMLDivElement>) => void;
}

const Palette = ({ onDragStart }: PaletteProps) => (
  <aside className={styles.palette}>
    <div>
      <h2 className={styles.paletteTitle}>Shelf elements</h2>
      <p className={styles.paletteHint}>Drag elements into the builder on the right. Items snap precisely into columns.</p>
    </div>

    <div className={styles.paletteList}>
      {(Object.keys(ITEM_CATALOG) as ShelfItemType[]).map((itemType) => {
        const definition = ITEM_CATALOG[itemType];
        return (
          <div key={itemType} className={styles.paletteItem}>
            <div
              className={`${styles.piece} ${styles.paletteShape}`}
              style={{ width: SHELF_WIDTH, height: definition.pixelHeight }}
              draggable
              onDragStart={onDragStart(itemType)}
              role='button'
              aria-label={definition.label}
              data-type={itemType}
            />
            <span className={styles.paletteCaption}>{definition.label}</span>
          </div>
        );
      })}
    </div>
  </aside>
);

interface CanvasProps {
  columns: ShelfColumn[];
  columnRanges: PieceRange[][];
  dropZoneStyle: DropZoneStyle;
  contentWidth: number;
  draggingPieceId: string | null;
  poofingPieces: string[];
  dropZoneRef: RefObject<HTMLDivElement | null>;
  canvasRef: RefObject<HTMLDivElement | null>;
  onDragOver: (event: React.DragEvent<HTMLDivElement>) => void;
  onDrop: (event: React.DragEvent<HTMLDivElement>) => void;
  onPieceDragStart: (columnIndex: number, piece: ShelfItem) => (event: React.DragEvent<HTMLDivElement>) => void;
  onPieceDragEnd: (event: React.DragEvent<HTMLDivElement>) => void;
}

const Canvas = ({
  columns,
  columnRanges,
  dropZoneStyle,
  contentWidth,
  draggingPieceId,
  poofingPieces,
  dropZoneRef,
  canvasRef,
  onDragOver,
  onDrop,
  onPieceDragStart,
  onPieceDragEnd,
}: CanvasProps) => {
  return (
    <section className={styles.board}>
      <div
        className={styles.dropZone}
        ref={dropZoneRef}
        onDragOver={onDragOver}
        onDrop={onDrop}
        role='grid'
        aria-label='Shelf builder workspace'
        style={dropZoneStyle}
      >
        <div className={styles.canvasViewport}>
          <div className={styles.canvas} style={{ width: contentWidth }} ref={canvasRef}>
            {columns.length === 0 && (
              <div className={styles.boardEmpty}>
                <span className={styles.boardEmptyText}>Drop a shelf to begin</span>
              </div>
            )}

            {columns.map((column, columnIndex) => {
              const currentRanges = columnRanges[columnIndex] ?? [];
              const leftRanges = columnRanges[columnIndex - 1] ?? [];
              const rightRanges = columnRanges[columnIndex + 1] ?? [];

              let accumulatedUnits = 0;
              return column.pieces.map((piece, pieceIndex) => {
                const definition = ITEM_CATALOG[piece.type];
                const isDragging = draggingPieceId === piece.id;
                const isPoofing = poofingPieces.includes(piece.id);
                const bottomUnits = accumulatedUnits;
                accumulatedUnits += piece.heightUnits;

                const range = currentRanges[pieceIndex] ?? {
                  bottom: bottomUnits,
                  top: bottomUnits + piece.heightUnits,
                };

                const hasPieceBelow = pieceIndex > 0;
                const hasPieceAbove = pieceIndex < column.pieces.length - 1;

                const overlaps = (candidate: PieceRange) =>
                  Math.max(candidate.bottom, range.bottom) < Math.min(candidate.top, range.top);

                const hasLeftNeighbor = leftRanges.some(overlaps);
                const hasRightNeighbor = rightRanges.some(overlaps);

                return (
                  <div
                    key={piece.id}
                    className={`${styles.piece} ${styles.canvasPiece} ${isDragging ? styles.pieceDragging : ''} ${
                      isPoofing ? styles.piecePoof : ''
                    }`}
                    draggable={!isPoofing}
                    onDragStart={onPieceDragStart(columnIndex, piece)}
                    onDragEnd={onPieceDragEnd}
                    style={{
                      width: SHELF_WIDTH,
                      height: definition.pixelHeight,
                      left: columnIndex * (SHELF_WIDTH + COLUMN_GAP),
                      bottom: bottomUnits * BASE_HEIGHT,
                      pointerEvents: isPoofing ? 'none' : undefined,
                      borderLeftWidth: hasLeftNeighbor ? BORDER_HALF : BORDER_FULL,
                      borderRightWidth: hasRightNeighbor ? BORDER_HALF : BORDER_FULL,
                      borderTopWidth: hasPieceAbove ? BORDER_HALF : BORDER_FULL,
                      borderBottomWidth: hasPieceBelow ? BORDER_HALF : 0,
                      borderStyle: 'solid',
                      borderColor: '#cccccc',
                    }}
                    role='button'
                    aria-grabbed={isDragging}
                    aria-label={`${definition.label} – height ratio ${piece.type === 'high' ? '0.8' : '0.4'}:1`}
                    data-type={piece.type}
                  />
                );
              });
            })}
          </div>
        </div>
      </div>
    </section>
  );
};

// === Page Component ===
const ShelfBuilder = () => {
  // --- State ---
  const [columns, setColumns] = useState<ShelfColumn[]>([]);
  const [draggingPieceId, setDraggingPieceId] = useState<string | null>(null);
  const [poofingPieces, setPoofingPieces] = useState<string[]>([]);
  const [layoutJson, setLayoutJson] = useState<string>('');

  // --- Refs ---
  const dropZoneRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const draggedOriginRef = useRef<{ columnIndex: number; pieceId: string } | null>(null);

  // --- Geometry Helpers ---
  const computeTargetColumnIndex = useCallback(
    (clientX: number, columnCount = columns.length) => {
      const zone = dropZoneRef.current;
      if (!zone) {
        return 0;
      }

      const zoneRect = zone.getBoundingClientRect();
      const computed = window.getComputedStyle(zone);
      const paddingLeft = parseFloat(computed.paddingLeft || '0');
      const paddingRight = parseFloat(computed.paddingRight || '0');
      const step = SHELF_WIDTH + COLUMN_GAP;
      const columnWidth = Math.max(columnCount, 1) * step;
      const contentWidth = Math.max(columnWidth, SHELF_WIDTH);
      const availableWidth = Math.max(zoneRect.width - paddingLeft - paddingRight, 0);
      const offset = Math.max(0, (availableWidth - contentWidth) / 2);
      const relativeX = clientX - zoneRect.left - paddingLeft - offset;

      if (columnCount === 0) {
        return 0;
      }

      const centers = Array.from({ length: columnCount }, (_, index) => index * step + SHELF_WIDTH / 2);

      let closestIndex = 0;
      let minDistance = Number.POSITIVE_INFINITY;

      centers.forEach((center, index) => {
        const distance = Math.abs(relativeX - center);
        if (distance < minDistance) {
          minDistance = distance;
          closestIndex = index;
        }
      });

      const lastCenter = centers[centers.length - 1];
      if (relativeX >= lastCenter + step / 2) {
        return centers.length;
      }

      const firstCenter = centers[0];
      if (relativeX <= firstCenter - step / 2) {
        return -1;
      }

      return closestIndex;
    },
    [columns.length]
  );

  // --- Drag Helpers ---
  const resetDragState = useCallback(() => {
    setDraggingPieceId(null);
  }, []);

  const handlePaletteDragStart = useCallback((itemType: ShelfItemType) => {
    return (event: React.DragEvent<HTMLDivElement>) => {
      const payload: DragPayload = { kind: 'palette', itemType };
      event.dataTransfer?.setData('application/json', JSON.stringify(payload));
      const rect = event.currentTarget.getBoundingClientRect();
      event.dataTransfer?.setDragImage(event.currentTarget, rect.width / 2, rect.height / 2);
      event.dataTransfer!.effectAllowed = 'copyMove';
      setDraggingPieceId(null);
    };
  }, []);

  const handlePieceDragStart = useCallback(
    (columnIndex: number, piece: ShelfItem) => {
      return (event: React.DragEvent<HTMLDivElement>) => {
        const payload: DragPayload = {
          kind: 'board',
          columnIndex,
          pieceId: piece.id,
          itemType: piece.type,
        };
        event.dataTransfer?.setData('application/json', JSON.stringify(payload));
        event.dataTransfer?.setDragImage(
          event.currentTarget,
          event.currentTarget.clientWidth / 2,
          event.currentTarget.clientHeight / 2
        );
        event.dataTransfer!.effectAllowed = 'move';
        setDraggingPieceId(piece.id);
        draggedOriginRef.current = { columnIndex, pieceId: piece.id };
      };
    },
    []
  );

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer!.dropEffect = 'move';
  }, []);

  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      const rawPayload = event.dataTransfer?.getData('application/json');

      if (!rawPayload) {
        resetDragState();
        return;
      }

      let payload: DragPayload;
      try {
        payload = JSON.parse(rawPayload) as DragPayload;
      } catch {
        resetDragState();
        return;
      }

      const targetIndex = computeTargetColumnIndex(event.clientX);

      setColumns((previousColumns) => {
        const workingColumns = previousColumns.map((column) => ({
          ...column,
          pieces: [...column.pieces],
        }));

        let movingPiece: ShelfItem | null = null;
        let originColumnId: string | null = null;
        let originInsertIndex = 0;

        if (payload.kind === 'palette') {
          const definition = ITEM_CATALOG[payload.itemType];
          movingPiece = {
            id: makeId(),
            type: payload.itemType,
            heightUnits: definition.unitHeight,
          };
        } else {
          const originColumn = workingColumns[payload.columnIndex];
          if (!originColumn) {
            return previousColumns;
          }

          originColumnId = originColumn.id;
          const pieceIndex = originColumn.pieces.findIndex((piece) => piece.id === payload.pieceId);
          if (pieceIndex === -1) {
            return previousColumns;
          }

          originInsertIndex = pieceIndex;
          [movingPiece] = originColumn.pieces.splice(pieceIndex, 1);
        }

        if (!movingPiece) {
          return previousColumns;
        }

        let safeTargetIndex = targetIndex;
        if (safeTargetIndex < 0) {
          workingColumns.unshift({
            id: `column-${makeId()}`,
            pieces: [],
          });
          safeTargetIndex = 0;
        } else if (safeTargetIndex > workingColumns.length) {
          safeTargetIndex = workingColumns.length;
        }

        if (safeTargetIndex === workingColumns.length) {
          workingColumns.push({
            id: `column-${makeId()}`,
            pieces: [],
          });
        }

        const destinationColumn = workingColumns[safeTargetIndex];
        if (!destinationColumn) {
          return previousColumns;
        }

        const availableUnits = MAX_STACK_UNITS - totalUnits(destinationColumn.pieces);
        if (availableUnits < movingPiece.heightUnits) {
          if (payload.kind === 'board' && originColumnId) {
            const restoreColumn = workingColumns.find((column) => column.id === originColumnId);
            if (restoreColumn) {
              restoreColumn.pieces.splice(originInsertIndex, 0, movingPiece);
            }
          }
          return workingColumns.filter((column) => column.pieces.length > 0);
        }

        destinationColumn.pieces.push(movingPiece);

        return workingColumns.filter((column) => column.pieces.length > 0);
      });

      draggedOriginRef.current = null;
      resetDragState();
    },
    [computeTargetColumnIndex, resetDragState]
  );

  const handlePieceDragEnd = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      const origin = draggedOriginRef.current;
      setDraggingPieceId(null);

      if (!origin) {
        return;
      }

      const canvas = canvasRef.current;
      if (!canvas) {
        draggedOriginRef.current = null;
        return;
      }

      const canvasRect = canvas.getBoundingClientRect();
      const { clientX, clientY } = event;
      const isInsideCanvas =
        clientX >= canvasRect.left &&
        clientX <= canvasRect.right &&
        clientY >= canvasRect.top &&
        clientY <= canvasRect.bottom;

      if (isInsideCanvas) {
        draggedOriginRef.current = null;
        return;
      }

      const pieceId = origin.pieceId;

      setPoofingPieces((previous) => (previous.includes(pieceId) ? previous : [...previous, pieceId]));

      window.setTimeout(() => {
        setColumns((previousColumns) =>
          previousColumns
            .map((column) => ({
              ...column,
              pieces: column.pieces.filter((piece) => piece.id !== pieceId),
            }))
            .filter((column) => column.pieces.length > 0)
        );
        setPoofingPieces((previous) => previous.filter((id) => id !== pieceId));
      }, POOF_DURATION_MS);

      draggedOriginRef.current = null;
    },
    []
  );

  // --- Derived Data ---
  const descriptor = useMemo(() => {
    return columns.map((column, columnIndex) => {
      let altitude = 0;

      const pieces = column.pieces.map((piece) => {
        const definition = ITEM_CATALOG[piece.type];
        const segment = {
          id: piece.id,
          type: piece.type,
          heightUnits: piece.heightUnits,
          heightPx: definition.pixelHeight,
          widthPx: SHELF_WIDTH,
          bottomUnits: altitude,
        };
        altitude += piece.heightUnits;
        return segment;
      });

      return {
        columnId: column.id,
        columnIndex,
        totalUnits: totalUnits(column.pieces),
        maxUnits: MAX_STACK_UNITS,
        pieces,
      };
    });
  }, [columns]);

  useEffect(() => {
    const payload = {
      shelf: {
        widthPx: SHELF_WIDTH,
        baseHeightPx: BASE_HEIGHT,
        maxUnits: MAX_STACK_UNITS,
      },
      columns: descriptor,
    };

    setLayoutJson(JSON.stringify(payload));
  }, [descriptor]);

  const columnRanges = useMemo<PieceRange[][]>(() => {
    return columns.map((column) => {
      let altitude = 0;
      return column.pieces.map((piece) => {
        const bottom = altitude;
        const top = bottom + piece.heightUnits;
        altitude = top;
        return { id: piece.id, bottom, top };
      });
    });
  }, [columns]);

  const contentWidth = useMemo(() => {
    const step = SHELF_WIDTH + COLUMN_GAP;
    return Math.max(columns.length * step, SHELF_WIDTH);
  }, [columns.length]);

  const dropZoneStyle = useMemo<DropZoneStyle>(() => {
    return {
      '--unit-width': `${SHELF_WIDTH}px`,
      '--unit-base-height': `${BASE_HEIGHT}px`,
      '--content-width': `${contentWidth}px`,
    };
  }, [contentWidth]);

  // --- Render ---
  return (
    <div className={styles.wrapper} data-layout-json={layoutJson}>
      <Palette onDragStart={handlePaletteDragStart} />

      <Canvas
        columns={columns}
        columnRanges={columnRanges}
        dropZoneStyle={dropZoneStyle}
        contentWidth={contentWidth}
        draggingPieceId={draggingPieceId}
        poofingPieces={poofingPieces}
        dropZoneRef={dropZoneRef}
        canvasRef={canvasRef}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onPieceDragStart={handlePieceDragStart}
        onPieceDragEnd={handlePieceDragEnd}
      />
    </div>
  );
};

export default ShelfBuilder;
