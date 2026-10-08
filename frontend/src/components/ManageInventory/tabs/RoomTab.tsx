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
import post from "@/api/post"
import useOrgs from "@/store/useOrgs"
import { toast } from "sonner"

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''

interface RoomTabProps {
  buildings: Building[]
  rooms: Room[]
  refetch: () => void
}

function RoomTab({ buildings, rooms, refetch }: RoomTabProps) {
  const [name, setName] = useState<string>("")
  const [floor, setFloor] = useState<string>("")
  const [number, setNumber] = useState<string>("")
  const [buildingId, setBuildingId] = useState<string | undefined>()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const selectedOrg = useOrgs(s => s.selectedOrg)

  const isComplete = floor.trim() !== "" && number.trim() !== "" && buildingId != null

  const handleSubmit = async () => {
    if (!isComplete) return
    if (!selectedOrg) { toast.error("No organisation selected"); return }

    setIsSubmitting(true)
    try {
      await post(`${API_BASE_URL}/organisations/${selectedOrg.name}/buildings/${buildingId}/rooms`, {
        // Rooms are listed and picked by name (e.g. in the Shelf Builder),
        // so fall back to floor + number when no name is given.
        name: name.trim() || `${floor.trim()} ${number.trim()}`,
        floor: floor.trim(),
        number: number.trim(),
      })
      toast.success("Room added successfully")
      setName("")
      setFloor("")
      setNumber("")
      refetch()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add room")
    } finally {
      setIsSubmitting(false)
    }
  }

  const elements: FormElement[] = [
    {
      size: "half",
      id: "room-floor",
      label: "Floor",
      input: <Input
        id="room-floor"
        placeholder="F"
        value={floor}
        onChange={e => setFloor(e.target.value)}
      />
    },
    {
      size: "half",
      id: "room-number",
      label: "Number",
      input: <Input
        id="room-number"
        placeholder="33.3"
        value={number}
        onChange={e => setNumber(e.target.value)}
      />
    },
    {
      size: "half",
      id: "room-name",
      label: "Name (optional)",
      input: <Input
        id="room-name"
        placeholder="Office"
        value={name}
        onChange={e => setName(e.target.value)}
      />
    },
    {
      size: "half",
      id: "room-building-id",
      label: "Building",
      input: <StandardSelect
        id="room-building-id"
        value={buildingId}
        options={buildings}
        onValueChange={value => setBuildingId(value)}
      />
    }
  ]

  return (
    <TabsContent value="rooms">
      <div className="space-y-10">
        <ManageInventoryCard
          title="Add Room"
          elements={elements}
          onSubmit={handleSubmit}
          disabled={!isComplete || isSubmitting}
        />

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
