import clsx from 'clsx';

import { ELEMENT_CATALOG, type Shelf, type ShelfColumn } from "../../../types/shelf";
import { ShelfElementViewInner } from "./ShelfElementView";

import styles from './StaticShelf.module.css';


interface StaticShelfColumnParams {
  column: ShelfColumn;
  shelf : Shelf;
  onElementSelect?: (params: { elementId: string; building: string; room: string; shelf: string }) => void;
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
              elementId: element.id,
              building: shelf.buildingName,
              room: shelf.roomName,
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


interface StaticShelfParams {
  shelf : Shelf;
  onElementSelect?: (params: { elementId: string; building: string; room: string; shelf: string }) => void;
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
