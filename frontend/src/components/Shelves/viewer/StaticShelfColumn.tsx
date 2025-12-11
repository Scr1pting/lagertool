import { ELEMENT_CATALOG, type SelectedShelfElement, type Shelf, type ShelfColumn } from "@/types/shelf";
import { ShelfElementViewInner } from "../shared/ShelfElementView";

import styles from './StaticShelf.module.css';
import { cn } from "@/lib/utils";


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
            className={cn(styles.elementTrigger, highlightedElement === element.id ? styles.highlightedElement : "")}
            onClick={() => onElementSelect?.({
              id: element.id,
              buildingName: shelf.building.name,
              roomName: shelf.room.name,
              shelfName: shelf.name,
            })}
          >
            <ShelfElementViewInner
              itemDef={definition}
              data-type={element.type}
            >
              <div className={styles.idElement}>{ element.id }</div>
            </ShelfElementViewInner>
          </button>
        );
      })}
    </div>
  );
}

export default StaticShelfColumn
