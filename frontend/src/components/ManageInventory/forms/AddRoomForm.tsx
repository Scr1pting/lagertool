import LabeledSelect from "@/components/LabeledSelect"
import { Input } from "@/components/shadcn/input"
import type { Building } from "@/types/building"
import type { Room } from "@/types/room"
import { useState } from "react"
import ManageInventoryElements from "../ManageInventoryElements"
import roomColumns from "@/components/DataTable/RoomColumns"
import type { ManageInventoryElement } from "../types/ManageInventoryElement"


interface AddRoomProps {
  buildings: Building[]
  rooms: Room[]
}

function AddRoom({ buildings, rooms }: AddRoomProps) {
  const [name, setName] = useState<string>("")
  const [buildingId, setBuildingId] = useState<string | undefined>()

  const elements: ManageInventoryElement[] = [
    {
      size: "full",
      id: "room-name",
      label: "Room Name",
      input: <Input
        id="room-name"
        placeholder="Office"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
    },
    {
      size: "full",
      id: "room-building-id",
      label: "Building",
      input: <LabeledSelect
        id="room-building-id"
        value={buildingId}
        options={buildings}
        onValueChange={(value) => setBuildingId(value) }
      />
    }
  ]

  return (
    <ManageInventoryElements 
      type={"room"}
      elements={elements}
      tableItems={rooms}
      columnDef={roomColumns}
    />
  )
}

export default AddRoom
