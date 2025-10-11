import { ELEMENT_CATALOG, type Shelf, type ShelfColumn } from "../types/shelf";
import { ShelfElementViewInner } from "./ShelfElementView";

import shelfListStyle from './ShelfList.module.css';
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
            {element.numItems != null
              && element.numItems != 1
              && (
                <div className={styles.numItem}>{ element.numItems }</div>
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
    <section className={styles.StaticShelf}>
      <div>
        {shelf.columns.map((column) => (
          <StaticShelfColumn key={column.id} column={column} />
        ))}
      </div>
    </section>
  );
};

export default StaticShelf;
