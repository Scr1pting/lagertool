import { ELEMENT_CATALOG, type Shelf, type ShelfColumn } from "../types/shelf";
import { ShelfElementViewInner } from "./ShelfElementView";

import canvasStyles from './Canvas.module.css';
import styles from './StaticShelf.module.css';


function StaticShelfColumn({ column }: { column: ShelfColumn }) {
  return (
    <div>
      {column.elements.map((element) => {
        const definition = ELEMENT_CATALOG[element.type];
        return (
          <ShelfElementViewInner
            key={element.id}
            itemDef={definition}
            data-type={element.type}
            classes={styles.elementInner}
          >
            {element.numElements != null
              && element.numElements != 0
              && (
              <div className={styles.numElements}>{ element.numElements }</div>
            )}

            <div className={styles.idElement}>{ element.id }</div>
          </ShelfElementViewInner>
        );
      })}
    </div>
  );
}

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
