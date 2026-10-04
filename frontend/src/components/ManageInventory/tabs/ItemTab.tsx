import type { Building } from "@/types/building"
import type { InventoryItem } from "@/types/inventory"
import type { Room } from "@/types/room"
import type { Shelf } from "@/types/shelf"
import useItemForm from "@/components/ItemForm/useItemForm"
import { useState } from "react"
import DataTable from "@/components/DataTable/DataTable"
import { TabsContent } from "@/components/shadcn/tabs"
import ManageInventoryCard from "../ManageInventoryCard"
import AvailabilityDescription from "@/components/AvailabilityDescription"
import { inventoryColumnsBase } from "@/components/DataTable/InventoryTable/inventoryColumnsBase"
import post from "@/api/post"
import useOrgs from "@/store/useOrgs"
import { toast } from "sonner"

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''

interface ItemTabProps {
  buildings: Building[]
  rooms: Room[]
  shelves: Shelf[]
  inventory: InventoryItem[]
  refetch: () => void
}

function ItemTab({ shelves, inventory, refetch }: ItemTabProps) {
  const { values, elements, validate, toPayload, reset } = useItemForm(shelves)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const selectedOrg = useOrgs(s => s.selectedOrg)

  const handleSubmit = async () => {
    if (!validate()) return
    if (!selectedOrg) { toast.error("No organisation selected"); return }

    setIsSubmitting(true)
    try {
      await post(`${API_BASE_URL}/organisations/${selectedOrg.name}/items`, {
        ...toPayload(),
        shelfId: values.shelf!.id,
        note: "",
      })
      toast.success("Item added successfully")
      reset()
      refetch()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add item")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <TabsContent value="items">
      <div className="space-y-10">
        <ManageInventoryCard
          title="Add Item"
          elements={elements}
          onSubmit={handleSubmit}
          disabled={isSubmitting}
        />

        <section className="space-y-3">
          <header>
            <h2 className="text-xl font-semibold">
              Recently Added
            </h2>

            <AvailabilityDescription />
          </header>

          <DataTable
            data={inventory}
            columns={inventoryColumnsBase}
            rowLink={row => `/item?id=${row.original.id}`}
          />
        </section>
      </div>
    </TabsContent>
  )
}

export default ItemTab
