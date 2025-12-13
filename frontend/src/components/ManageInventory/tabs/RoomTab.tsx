import StandardSelect from "@/components/primitives/StandardSelect"
import { Input } from "@/components/shadcn/input"
import type { Building } from "@/types/building"
import type { Room } from "@/types/room"
import { useState } from "react"
import type { FormElement } from "@/components/primitives/types/FormElement"
import { TabsContent } from "@/components/shadcn/tabs"
import DataTable from "@/components/DataTable/DataTable"
import ManageInventoryCard from "../ManageInventoryCard"
import roomColumns from "@/components/DataTable/ManageInventory/roomColumns"


interface RoomTabProps {
  buildings: Building[]
  rooms: Room[]
}

function RoomTab({ buildings, rooms }: RoomTabProps) {
  const [name, setName] = useState<string>("")
  const [buildingId, setBuildingId] = useState<string | undefined>()

  const elements: FormElement[] = [
    {
      size: "half",
      id: "room-floor",
      label: "Floor",
      input: <Input
        id="room-floor"
        placeholder="F"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
    },
    {
      size: "half",
      id: "room-number",
      label: "Number",
      input: <Input
        id="room-number"
        placeholder="33.3"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
    },
    {
      size: "full",
      id: "room-name",
      label: "Name (Optional)",
      input: <Input
        id="room-name"
        placeholder="Office"
        value={name}
        onChange={e => setName(e.target.value)}
      />
    },
    {
      size: "full",
      id: "room-building-id",
      label: "Building",
      input: <StandardSelect
        id="room-building-id"
        value={buildingId}
        options={buildings}
        onValueChange={value => setBuildingId(value) }
      />
    }
  ]

  return (
    <TabsContent value="rooms">
      <div className="space-y-10">
        <ManageInventoryCard title="Add Room" elements={elements} />
        
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
