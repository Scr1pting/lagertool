import { useState } from "react"
import type { FormElement } from "../../primitives/types/FormElement"
import { Input } from "@/components/shadcn/input"
import type { Building } from "@/types/building"
import DataTable from "@/components/DataTable/DataTable"
import { TabsContent } from "@/components/shadcn/tabs"
import ManageInventoryCard from "../ManageInventoryCard"
import buildingColumns from "@/components/DataTable/ManageInventory/buildingColumns"
import post from "@/api/post"
import useOrgs from "@/store/useOrgs"
import { toast } from "sonner"

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''

interface BuildingTabProps {
  buildings: Building[]
  refetch: () => void
}

function BuildingTab({ buildings, refetch }: BuildingTabProps) {
  const [name, setName] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const selectedOrg = useOrgs(s => s.selectedOrg)

  const isComplete = name.trim() !== ""

  const handleSubmit = async () => {
    if (!isComplete) return
    if (!selectedOrg) { toast.error("No organisation selected"); return }

    setIsSubmitting(true)
    try {
      await post(`${API_BASE_URL}/organisations/${selectedOrg.name}/buildings`, {
        name: name.trim(),
      })
      toast.success("Building added successfully")
      setName("")
      refetch()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add building")
    } finally {
      setIsSubmitting(false)
    }
  }

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
        <ManageInventoryCard
          title="Add Building"
          elements={elements}
          onSubmit={handleSubmit}
          disabled={!isComplete || isSubmitting}
        />

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
