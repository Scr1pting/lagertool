import { useMemo } from 'react';
import { type ShelfItemType, ITEM_CATALOG } from '../types/shelf';

import styles from './Palette.module.css';
import ShelfPiece from './ShelfPiece';

function Palette() {
  const catalogEntries = useMemo(
    () => Object.entries(ITEM_CATALOG) as [ShelfItemType, typeof ITEM_CATALOG[keyof typeof ITEM_CATALOG]][],
    []
  );

  return (
    <aside className={styles.palette}>
      <div>
        <h2 className={styles.paletteTitle}>Shelf elements</h2>
        <p className={styles.paletteHint}>Drag elements into the builder on the right. Items snap automatically into columns.</p>
      </div>

      <div className={styles.paletteList}>
        {catalogEntries.map(([itemType, itemDef]) => (
          <div className={styles.paletteItem}>
            <ShelfPiece
              itemDef={itemDef}
              draggableId={`palette-${itemType}`}
              dragData={{ source: 'palette', itemType }}
              applyTransform={false}
              data-type={itemType} />
            <span className={styles.paletteCaption}>{ITEM_CATALOG[itemType].label}</span>
          </div>
        ))}
      </div>
    </aside>
  );
}

export default Palette;
