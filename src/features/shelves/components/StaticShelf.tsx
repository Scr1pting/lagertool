import { ELEMENT_CATALOG, type Shelf, type ShelfColumn } from "../types/shelf";
import { ShelfElementViewInner } from "./ShelfElementView";

import canvasStyles from './Canvas.module.css';
import styles from './StaticShelf.module.css';


function StaticShelfColumn({ column }: { column: ShelfColumn }) {
  return (
    <>
      {column.elements.map((element) => {
        const definition = ELEMENT_CATALOG[element.type];
        return (
          <div key={element.id} className={styles.elementWrapper}>
            <ShelfElementViewInner
              itemDef={definition}
              data-type={element.type}
            >
              {element.numItem != null
                && element.numItem != 0
                && (
                <div className={styles.numItem}>{ element.numItem }</div>
              )}
            </ShelfElementViewInner>

            {/* place idElement outside the inner view so it can be absolutely positioned relative to .elementWrapper */}
            <div className={styles.idElement}>{ element.id }</div>
          </div>
        );
      })}
    </>
  );
};

function StaticShelf({ shelf }: { shelf : Shelf }) {
  return (
    <section className={canvasStyles.board}>
      <div className={canvasStyles.workspace} role="grid" aria-label="Shelf representation">
        <div>
          {shelf.columns.map((column) => (
            <StaticShelfColumn key={column.id} column={column} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default StaticShelf;
