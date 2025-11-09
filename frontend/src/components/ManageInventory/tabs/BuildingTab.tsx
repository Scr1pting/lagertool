import { useState } from "react"
import type { ManageInventoryElement } from "../types/ManageInventoryElement"
import { Input } from "@/components/shadcn/input"
import type { Building } from "@/types/building"
import ManageInventoryForm from "../ManageInventoryCard"
import DataTable from "@/components/DataTable/DataTable"
import { TabsContent } from "@/components/shadcn/tabs"
import buildingColumns from "@/components/DataTable/ManageInventory/BuildingColumns"


interface BuildingTabProps {
  buildings: Building[]
}

function BuildingTab({ buildings }: BuildingTabProps) {
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
    <TabsContent value="buildings">
      <div className="space-y-10">
        <ManageInventoryForm title="Add Building" elements={elements} />

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">
            Recently Added
          </h2>
          <DataTable
            data={buildings}
            columns={buildingColumns}
          />
        </section>
      </div>
    </TabsContent>
  )
}

export default BuildingTab
