import LabeledSelect from "@/components/LabeledSelect"
import { Input } from "@/components/shadcn/input"
import type { Building } from "@/types/building"
import type { Room } from "@/types/room"
import { useState } from "react"
import type { ManageInventoryElement } from "../types/ManageInventoryElement"
import { TabsContent } from "@/components/shadcn/tabs"
import DataTable from "@/components/DataTable/DataTable"
import roomColumns from "@/components/DataTable/ManageInventory/RoomColumns"
import ManageInventoryCard from "../ManageInventoryCard"


interface RoomTabProps {
  buildings: Building[]
  rooms: Room[]
}

function RoomTab({ buildings, rooms }: RoomTabProps) {
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
    <TabsContent value="rooms">
      <div className="space-y-10">
        <ManageInventoryCard title="Add Building" elements={elements} />
        
        <section className="space-y-3">
          <h2 className="text-xl font-semibold">
            Recently Added
          </h2>
          <DataTable
            data={rooms}
            columns={roomColumns}
          />
        </section>
      </div>
    </TabsContent>
  )
}

export default RoomTab
