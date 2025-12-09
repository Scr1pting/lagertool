import { Input } from "@/components/shadcn/input"
import type { Building } from "@/types/building"
import type { InventoryItem } from "@/types/inventory"
import type { Room } from "@/types/room"
import type { Shelf } from "@/types/shelf"
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


interface ShelfOption {
  name: string
  id: string
  buildingId: number
  roomId: number
}

interface ItemTabProps {
  buildings: Building[]
  rooms: Room[]
  shelves: Shelf[]
  inventory: InventoryItem[]
}

function ItemTab({ shelves, inventory }: ItemTabProps) {
  const [name, setName] = useState("")
  const [amount, setAmount] = useState(1)

  const [selectedOption, setSelectedOption] = useState<ShelfOption | undefined>()
  const [shelfElementId, setShelfElementId] = useState<string | undefined>()

  const [showElementSelect, setShowElementSelect] = useState(false)

  const selectedShelf = shelves.find(shelf => shelf.id == selectedOption?.id)

  const options: ShelfOption[] = shelves.map(shelf => {
    const text = `${shelf.building.name} - ${shelf.room.name} - ${shelf.name}`
    return {
      name: text,
      id: shelf.id,
      buildingId: shelf.building.id,
      roomId: shelf.room.id,
    }
  })

  const elements: FormElement[] = [
    {
      size: "full",
      id: "item-name",
      label: "Name",
      input: <Input
        id="item-name"
        placeholder="Microphone"
        value={name}
        onChange={(e) => setName(e.target.value)}
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
        onChange={(e) => setAmount(Number.parseInt(e.target.value, 10))}
      />
    },
    {
      size: "half",
      id: "item-shelf-id",
      label: "Shelf",
      input: <Combobox
        options={options}
        selectedOption={selectedOption}
        setSelectedOption={setSelectedOption}
        placeholder="Select Shelf" />
    },
    {
      size: "half",
      id: "item-shelf-element-id",
      label: "Shelf Element",
      input: <ShelfElementSelect
          open={showElementSelect}
          onOpenChange={() => setShowElementSelect(false)}
          shelf={selectedShelf}
          selectedElementId={shelfElementId}
          setSelectedElementId={setShelfElementId}
        >
        <Button
          variant="outline"
          className="justify-between"
          disabled={selectedShelf == null}
        >
          Select Shelf Element
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
