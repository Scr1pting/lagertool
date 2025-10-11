import { ELEMENT_CATALOG, type Shelf, type ShelfColumn } from "../types/shelf";
import { ShelfElementViewInner } from "./ShelfElementView";

import styles from './StaticShelf.module.css';


function StaticShelfColumn({ column, shelf, onElementSelect }: { column: ShelfColumn, shelf: Shelf, onElementSelect?: (params: { elementId: string; building: string; room: string; shelf: string }) => void }) {
  return (
    <div className={styles.column}>
      {column.elements.map((element) => {
        const definition = ELEMENT_CATALOG[element.type];
        return (
          <button
            key={element.id}
            type="button"
            className={styles.elementTrigger}
            onClick={() => onElementSelect?.({
              elementId: element.id,
              building: shelf.building,
              room: shelf.room,
              shelf: shelf.name,
            })}
          >
            <ShelfElementViewInner
              itemDef={definition}
              data-type={element.type}
            >
              {element.numItems != null
                && element.numItems != 1
                && (
                  <div className={styles.numItem}>{ element.numItems }</div>
              )}

              <div className={styles.idElement}>{ element.id }</div>
            </ShelfElementViewInner>
          </button>
        );
      })}
    </div>
  );
}

function StaticShelf({ shelf, onElementSelect }: { shelf : Shelf, onElementSelect?: (params: { elementId: string; building: string; room: string; shelf: string }) => void }) {
  return (
    <section className={styles.StaticShelf}>
      <div>
        {shelf.columns.map((column) => (
          <StaticShelfColumn key={column.id} column={column} shelf={shelf} onElementSelect={onElementSelect} />
        ))}
      </div>
    </section>
  );
};

export default StaticShelf;
