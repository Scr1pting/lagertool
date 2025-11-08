import LabeledSelect from "@/components/LabeledSelect"
import { Input } from "@/components/shadcn/input"
import type { Building } from "@/types/building"
import type { InventoryItem } from "@/types/inventory"
import type { Room } from "@/types/room"
import type { Shelf } from "@/types/shelf"
import { useState } from "react"
import type { ManageInventoryElement } from "../types/ManageInventoryElement"
import ManageInventoryElements from "../ManageInventoryElements"
import { inventoryColumnsNoCart } from "@/components/DataTable/InventoryTable/InventoryColumns"


interface AddItemProps {
  buildings: Building[]
  rooms: Room[]
  shelves: Shelf[]
  inventory: InventoryItem[]
}

function AddItem({ buildings, rooms, shelves, inventory }: AddItemProps) {
  const [name, setName] = useState("")
  const [amount, setAmount] = useState(1)

  const [buildingId, setBuildingId] = useState<string | undefined>()
  const [roomId, setRoomId] = useState<string | undefined>()
  const [shelfId, setShelfId] = useState<string | undefined>()
  const [shelfElementId, setShelfElementId] = useState<string | undefined>()

  const elements: ManageInventoryElement[] = [
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
      id: "item-building-id",
      label: "Building",
      input: <LabeledSelect
        id="item-building-id"
        value={buildingId}
        options={buildings}
        onValueChange={(value) => setBuildingId(value) }
      />
    },
    {
      size: "half",
      id: "item-room-id",
      label: "Room",
      input: <LabeledSelect
        id="item-room-id"
        value={roomId}
        options={rooms}
        onValueChange={(value) => setRoomId(value) }
      />
    },
    {
      size: "half",
      id: "item-shelf-id",
      label: "Shelf",
      input: <LabeledSelect
        id="item-shelf-id"
        value={shelfId}
        options={shelves}
        onValueChange={(value) => setShelfId(value) }
      />
    },
    {
      size: "half",
      id: "item-shelf-element-id",
      label: "Shelf Element",
      input: <LabeledSelect
        id="item-shelf-element-id"
        value={shelfElementId}
        options={buildings}
        onValueChange={(value) => setShelfElementId(value) }
      />
    }
  ]

  return (
    <ManageInventoryElements 
      type={"item"}
      elements={elements}
      tableItems={inventory}
      columnDef={inventoryColumnsNoCart}
    />
  )
}

export default AddItem
