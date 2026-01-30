import { Input } from "@/components/shadcn/input"
import type { Building } from "@/types/building"
import type { InventoryItem } from "@/types/inventory"
import type { Room } from "@/types/room"
import type { Shelf, ShelfElement } from "@/types/shelf"
import { useState } from "react"
import type { FormElement } from "../../primitives/types/FormElement"
import DataTable from "@/components/DataTable/DataTable"
import { TabsContent } from "@/components/shadcn/tabs"
import ManageInventoryCard from "../ManageInventoryCard"
import AvailabilityDescription from "@/components/AvailabilityDescription"
import { inventoryColumns } from "@/components/DataTable/ManageInventory/inventoryColumns"
import Combobox from "@/components/primitives/Combobox"
import { Button } from "@/components/shadcn/button"
import ShelfElementSelect from "@/components/ShelfElementSelect"


interface ItemTabProps {
  buildings: Building[]
  rooms: Room[]
  shelves: Shelf[]
  inventory: InventoryItem[]
}

function ItemTab({ shelves, inventory }: ItemTabProps) {
  const [name, setName] = useState("")
  const [amount, setAmount] = useState(1)

  const [selectedShelf, setSelectedShelf] = useState<Shelf | undefined>()
  const [selectedElement, setSelectedElement] = useState<ShelfElement | undefined>()

  const [showElementSelect, setShowElementSelect] = useState(false)

  const elements: FormElement[] = [
    {
      size: "full",
      id: "item-name",
      label: "Name",
      input: <Input
        id="item-name"
        placeholder="e.g Microphone"
        value={name}
        onChange={e => setName(e.target.value)}
      />
    },
    {
      size: "full",
      id: "item-amount",
      label: "Amount",
      input: <Input
        id="item-amount"
        type="number"
        min="1"
        placeholder="e.g. 15"
        value={amount}
        onChange={e => setAmount(Number.parseInt(e.target.value, 10))}
      />
    },
    {
      size: "half",
      id: "item-shelf-id",
      label: "Shelf",
      input: <Combobox
        options={shelves}
        selectedOption={selectedShelf}
        onOptionChange={newOption => {
          setSelectedShelf(newOption)
          setSelectedElement(undefined)
        }}
        fieldKey="displayName"
        placeholder="Select Shelf" />
    },
    {
      size: "half",
      id: "item-shelf-element-id",
      label: "Shelf Element",
      input: <ShelfElementSelect
        open={showElementSelect}
        onOpenChange={newOpen => setShowElementSelect(newOpen)}
        shelf={selectedShelf}
        selectedElement={selectedElement}
        setSelectedElement={setSelectedElement}
      >
        <Button
          variant="outline"
          aria-expanded={showElementSelect}
          // We have to set px-3 because Shadcn uses less padding on
          // inputs and buttons with icons.
          className="justify-between truncate px-3"
        >
          {selectedElement ? selectedElement.id : "Select Shelf Element"}
        </Button>
      </ShelfElementSelect>
    }
  ]

  return (
    <TabsContent value="items">
      <div className="space-y-10">
        <ManageInventoryCard title="Add Item" elements={elements} />
        
        <section className="space-y-3">
          <header>
            <h2 className="text-xl font-semibold">
              Recently Added
            </h2>

            <AvailabilityDescription />
          </header>

          <DataTable
            data={inventory}
            columns={inventoryColumns}
          />
        </section>
      </div>
    </TabsContent>
  )
}

export default ItemTab
