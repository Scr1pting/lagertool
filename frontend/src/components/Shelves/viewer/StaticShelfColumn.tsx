import { ELEMENT_CATALOG, type Shelf, type ShelfColumn, type ShelfElement } from "@/types/shelf"
import { ShelfElementViewInner } from "../shared/ShelfElementView"

import styles from './StaticShelf.module.css'
import { cn } from "@/lib/cn"


interface StaticShelfColumnParams {
  column: ShelfColumn;
  shelf : Shelf;
  onElementSelect?: (newElement: ShelfElement) => void;
  highlightedElement?: string;
  showIds?: boolean;
}

function StaticShelfColumn({ column, onElementSelect, highlightedElement, showIds = true }: StaticShelfColumnParams) {
  return (
    <div className={styles.column}>
      {column.elements.map(element => {
        const definition = ELEMENT_CATALOG[element.type]
        return (
          <button
            key={element.id}
            type="button"
            title={element.id}
            className={cn(styles.elementTrigger, highlightedElement === element.id ? styles.highlightedElement : "")}
            onClick={() => onElementSelect?.(element)}
          >
            <ShelfElementViewInner
              itemDef={definition}
              data-type={element.type}
            >
              {showIds && <div className={styles.idElement}>{ element.id }</div>}
            </ShelfElementViewInner>
          </button>
        )
      })}
    </div>
  )
}

export default StaticShelfColumn
