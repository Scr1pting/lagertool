import { Input } from "@/components/shadcn/input"
import type { InventoryItem, InventoryItemPayload } from "@/types/inventory"
import type { Shelf } from "@/types/shelf"
import React, { useState } from "react"
import DataTable from "@/components/DataTable/DataTable"
import { TabsContent } from "@/components/shadcn/tabs"
import AvailabilityDescription from "@/components/AvailabilityDescription"
import { inventoryColumns } from "@/components/DataTable/ManageInventory/inventoryColumns"
import Combobox from "@/components/primitives/Combobox"
import { Button } from "@/components/shadcn/button"
import ShelfElementSelect from "@/components/ShelfElementSelect"


interface ItemFormProps {
  shelves: Shelf[]
  inventory: InventoryItem[]
  item: InventoryItemPayload
  setItem: React.Dispatch<React.SetStateAction<InventoryItemPayload>>
}

function ItemForm({ shelves, inventory, item, setItem }: ItemFormProps) {
  const [showElementSelect, setShowElementSelect] = useState(false)

  const elements: FormElement[] = [
    {
      size: "half",
      id: "item-name",
      label: "Name",
      input: <Input
        id="item-name"
        placeholder="e.g El Tony Mate"
        value={item.name}
        onChange={e => setItem(prev => ({
          ...prev,
          name: e.target.value
        }))}
      />
    },
    {
      size: "half",
      id: "item-amount",
      label: "Amount",
      input: <Input
        id="item-amount"
        type="number"
        min="1"
        placeholder="e.g. 15"
        value={item.amount}
        onChange={e => setItem(prev => ({
          ...prev,
          amount: Number.parseInt(e.target.value, 10)
        }))}
      />
    },
    {
      size: "full",
      id: "item-keywords",
      label: "Keywords (separated by commas)",
      input: <Input
        id="item-keywords"
        min="1"
        placeholder="e.g. Drink, Cans"
        value={item.keywords}
        onChange={e => setItem(prev => ({
          ...prev,
          keywords: e.target.value
        }))}
      />
    },
    {
      size: "half",
      id: "item-shelf-id",
      label: "Shelf",
      input: <Combobox
        options={shelves}
        selectedOption={item.shelf}
        onOptionChange={newOption => setItem(prev => ({
          ...prev,
          shelf: newOption,
          shelfElementId: undefined
        }))}
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
        shelf={item.shelf}
        selectedElement={item.shelfElement}
        onElementChange={newElement => setItem(prev => ({
          ...prev,
          shelfElement: newElement
        }))}
      >
        <Button
          variant="outline"
          aria-expanded={showElementSelect}
          // We have to set px-3 because shadcn uses less padding on
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
