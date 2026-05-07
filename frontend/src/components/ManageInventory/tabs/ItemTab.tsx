import { Input } from "@/components/shadcn/input"
import { Checkbox } from "@/components/shadcn/checkbox"
import { Label } from "@/components/shadcn/label"
import type { Building } from "@/types/building"
import type { InventoryItem } from "@/types/inventory"
import type { Room } from "@/types/room"
import type { Shelf, ShelfElement } from "@/types/shelf"
import { useState } from "react"
import type { FormElement } from "../../primitives/types/FormElement"
import DataTable from "@/components/DataTable/DataTable"
import { TabsContent } from "@/components/shadcn/tabs"
import ManageInventoryCard from "../ManageInventoryCard"
import AvailabilityDescription from "@/components/AvailabilityDescription"
import { inventoryColumns } from "@/components/DataTable/ManageInventory/inventoryColumns"
import Combobox from "@/components/primitives/Combobox"
import { Button } from "@/components/shadcn/button"
import ShelfElementSelect from "@/components/ShelfElementSelect"
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
  const [name, setName] = useState("")
  const [amount, setAmount] = useState(1)
  const [isConsumable, setIsConsumable] = useState(false)
  const [selectedShelf, setSelectedShelf] = useState<Shelf | undefined>()
  const [selectedElement, setSelectedElement] = useState<ShelfElement | undefined>()
  const [showElementSelect, setShowElementSelect] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const selectedOrg = useOrgs(s => s.selectedOrg)

  const handleSubmit = async () => {
    if (!name.trim()) { toast.error("Name is required"); return }
    if (!selectedShelf) { toast.error("Please select a shelf"); return }
    if (!selectedElement) { toast.error("Please select a shelf element"); return }
    if (!selectedOrg) { toast.error("No organisation selected"); return }

    setIsSubmitting(true)
    try {
      await post(`${API_BASE_URL}/organisations/${selectedOrg.name}/items`, {
        name: name.trim(),
        amount,
        shelfUnitId: selectedElement.id,
        shelfId: selectedShelf.id,
        isConsumable,
        note: "",
      })
      toast.success("Item added successfully")
      setName("")
      setAmount(1)
      setIsConsumable(false)
      setSelectedShelf(undefined)
      setSelectedElement(undefined)
      refetch()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add item")
    } finally {
      setIsSubmitting(false)
    }
  }

  const elements: FormElement[] = [
    {
      size: "half",
      id: "item-name",
      label: "Name",
      input: <Input
        id="item-name"
        placeholder="e.g El Tony Mate"
        value={name}
        onChange={e => setName(e.target.value)}
      />
    },
    {
      size: "half",
      id: "item-amount",
      label: "Amount",
      input: <Input
        id="item-amount"
        type="number"
        min="1"
        placeholder="e.g. 15"
        value={amount}
        onChange={e => setAmount(Number.parseInt(e.target.value, 10))}
      />
    },
    {
      size: "half",
      id: "item-shelf-id",
      label: "Shelf",
      input: <Combobox
        options={shelves}
        selectedOption={selectedShelf}
        onOptionChange={newOption => {
          setSelectedShelf(newOption)
          setSelectedElement(undefined)
        }}
        fieldKey="displayName"
        placeholder="Select Shelf" />
    },
    {
      size: "half",
      id: "item-shelf-element-id",
      label: "Shelf Element",
      input: <ShelfElementSelect
        open={showElementSelect}
        onOpenChange={newOpen => setShowElementSelect(newOpen)}
        shelf={selectedShelf}
        selectedElement={selectedElement}
        onElementChange={setSelectedElement}
      >
        <Button
          variant="outline"
          aria-expanded={showElementSelect}
          className="justify-between truncate px-3"
        >
          {selectedElement ? selectedElement.id : "Select Shelf Element"}
        </Button>
      </ShelfElementSelect>
    },
    {
      size: "full",
      id: "item-consumable",
      label: "Consumable",
      input: <div className="flex items-center gap-2 h-9">
        <Checkbox
          id="item-consumable"
          checked={isConsumable}
          onCheckedChange={checked => setIsConsumable(checked === true)}
        />
        <Label htmlFor="item-consumable" className="font-normal cursor-pointer">
          This item is consumable (not returned after use)
        </Label>
      </div>
    }
  ]

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
            columns={inventoryColumns}
          />
        </section>
      </div>
    </TabsContent>
  )
}

export default ItemTab
