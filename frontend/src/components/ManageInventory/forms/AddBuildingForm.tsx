import { useState } from "react"
import type { ManageInventoryElement } from "../types/ManageInventoryElement"
import { Input } from "@/components/shadcn/input"
import ManageInventoryElements from "../ManageInventoryElements"
import buildingColumns from "@/components/DataTable/BuildingColumns"
import type { Building } from "@/types/building"


interface AddBuildingProps {
  buildings: Building[]
}

function AddBuilding({ buildings }: AddBuildingProps) {
  const [name, setName] = useState<string>("")

  const elements: ManageInventoryElement[] = [
    {
      size: "full",
      id: "building-name",
      label: "Room Name",
      input: <Input
        id="building-name"
        placeholder="CAB"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
    }
  ]

  return (
    <ManageInventoryElements 
      type={"building"}
      elements={elements}
      tableItems={buildings}
      columnDef={buildingColumns}
    />
  )
}

export default AddBuilding
