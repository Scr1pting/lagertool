import clsx from 'clsx';

import { ELEMENT_CATALOG, type SelectedShelfElement, type Shelf, type ShelfColumn } from "../../../types/shelf";
import { ShelfElementViewInner } from "../shared/ShelfElementView";

import styles from './StaticShelf.module.css';


interface StaticShelfColumnParams {
  column: ShelfColumn;
  shelf : Shelf;
  onElementSelect?: (params: SelectedShelfElement) => void;
  highlightedElement?: string;
}

function StaticShelfColumn({ column, shelf, onElementSelect, highlightedElement }: StaticShelfColumnParams) {
  return (
    <div className={styles.column}>
      {column.elements.map((element) => {
        const definition = ELEMENT_CATALOG[element.type];
        return (
          <button
            key={element.id}
            type="button"
            className={clsx(styles.elementTrigger, highlightedElement === element.id ? styles.highlightedElement : "")}
            onClick={() => onElementSelect?.({
              id: element.id,
              buildingName: shelf.buildingName,
              roomName: shelf.roomName,
              shelfName: shelf.name,
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


interface StaticShelfParams {
  shelf : Shelf;
  onElementSelect?: (element: SelectedShelfElement) => void;
  highlightedElement?: string;
}

function StaticShelf({ shelf, onElementSelect, highlightedElement }: StaticShelfParams) {
  return (
    <section className={styles.StaticShelf}>
      <div className={styles.leftElement} />
      {shelf.columns.map((column) => (
        <StaticShelfColumn
          key={column.id}
          column={column}
          shelf={shelf}
          highlightedElement={highlightedElement}
          onElementSelect={onElementSelect}
        />
      ))}
      <div className={styles.rightElement} />
    </section>
  );
};

export default StaticShelf;
