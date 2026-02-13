import { useState } from "react"
import type { FormElement } from "../../primitives/types/FormElement"
import { Input } from "@/components/temp/input"
import type { Building } from "@/types/building"
import DataTable from "@/components/DataTable/DataTable"
import { TabsContent } from "@/components/temp/tabs"
import ManageInventoryCard from "../ManageInventoryCard"
import buildingColumns from "@/components/DataTable/ManageInventory/buildingColumns"


interface BuildingTabProps {
  buildings: Building[]
}

function BuildingTab({ buildings }: BuildingTabProps) {
  const [name, setName] = useState("")

  const elements: FormElement[] = [
    {
      size: "full",
      id: "building-name",
      label: "Building Name",
      input: <Input
        id="building-name"
        placeholder="CAB"
        value={name}
        onChange={e => setName(e.target.value)}
      />
    }
  ]

  return (
    <TabsContent value="buildings">
      <div className="space-y-10">
        <ManageInventoryCard title="Add Building" elements={elements} />

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
