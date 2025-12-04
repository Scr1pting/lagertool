import { Input } from "@/components/shadcn/input"
import type { Building } from "@/types/building"
import type { InventoryItem } from "@/types/inventory"
import type { Room } from "@/types/room"
import type { Shelf } from "@/types/shelf"
import { useState, type SetStateAction } from "react"
import type { FormElement } from "../../primitives/types/FormElement"
import DataTable from "@/components/DataTable/DataTable"
import { TabsContent } from "@/components/shadcn/tabs"
import ManageInventoryCard from "../ManageInventoryCard"
import AvailabilityDescription from "@/components/AvailabilityDescription"
import { inventoryColumns } from "@/components/DataTable/ManageInventory/inventoryColumns"
import { Combobox } from "@/components/primitives/Combobox"
import { Button } from "@/components/shadcn/button"
import ShelfElementSelect from "@/components/ShelfElementSelect"


interface Option {
  name: string
  buildingId: string
  roomId: string
  shelfId: string
}

interface ItemTabProps {
  buildings: Building[]
  rooms: Room[]
  shelves: Shelf[]
  inventory: InventoryItem[]
}

function ItemTab({ buildings, rooms, shelves, inventory }: ItemTabProps) {
  const [name, setName] = useState("")
  const [amount, setAmount] = useState(1)

  const [buildingId, setBuildingId] = useState<string | undefined>()
  const [roomId, setRoomId] = useState<string | undefined>()
  const [shelfId, setShelfId] = useState<string | undefined>()
  const [shelfElementId, setShelfElementId] = useState<string | undefined>()

  const [showElementSelect, setShowElementSelect] = useState(false)

  const selectedShelf = shelves.find(shelf => shelf.id == shelfId)

  const options = () => {
    shelves.map(shelf => {
      const bId = 

      new Option(text )
    })
  }
  
  const setOption = (option: Option) => {

  }

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
      // input: <Combobox
      //   options={[]}
      //   selectedId={false}
      //   setSelectedId={}
      //   placeholder="Select Shelf"
      // />
      input: <Combobox
        options={null}
        selectedId={null}
        setSelectedId={}
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
