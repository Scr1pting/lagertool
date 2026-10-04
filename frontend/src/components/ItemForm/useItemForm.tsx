import { Input } from "@/components/shadcn/input"
import { Checkbox } from "@/components/shadcn/checkbox"
import { Label } from "@/components/shadcn/label"
import { Button } from "@/components/shadcn/button"
import Combobox from "@/components/primitives/Combobox"
import ShelfElementSelect from "@/components/ShelfElementSelect"
import type { FormElement } from "@/components/primitives/types/FormElement"
import type { Shelf, ShelfElement } from "@/types/shelf"
import { useState } from "react"
import { toast } from "sonner"

export interface ItemFormValues {
  name: string
  amount: number
  isConsumable: boolean
  shelf?: Shelf
  element?: ShelfElement
}

export const EMPTY_ITEM_FORM: ItemFormValues = { name: "", amount: 1, isConsumable: false }

export function findShelfElement(shelf: Shelf | undefined, elementId: string): ShelfElement | undefined {
  return shelf?.columns.flatMap(column => column.elements).find(element => element.id === elementId)
}

// The item fields shared by the add form (Manage Inventory) and the edit dialog (item page).
function useItemForm(shelves: Shelf[]) {
  const [values, setValues] = useState<ItemFormValues>(EMPTY_ITEM_FORM)
  const [showElementSelect, setShowElementSelect] = useState(false)
  const set = (patch: Partial<ItemFormValues>) => setValues(prev => ({ ...prev, ...patch }))

  // Toasts the first problem; returns whether the values can be submitted.
  const validate = () => {
    if (!values.name.trim()) { toast.error("Name is required"); return false }
    if (!(values.amount >= 1)) { toast.error("Amount must be at least 1"); return false }
    if (!values.shelf) { toast.error("Please select a shelf"); return false }
    if (!values.element) { toast.error("Please select a shelf element"); return false }
    return true
  }

  const elements: FormElement[] = [
    {
      size: "half",
      id: "item-name",
      label: "Name",
      input: <Input
        id="item-name"
        placeholder="e.g El Tony Mate"
        value={values.name}
        onChange={e => set({ name: e.target.value })}
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
        value={values.amount}
        onChange={e => set({ amount: Number.parseInt(e.target.value, 10) })}
      />
    },
    {
      size: "half",
      id: "item-shelf-id",
      label: "Shelf",
      input: <Combobox
        options={shelves}
        selectedOption={values.shelf}
        onOptionChange={newOption => set({ shelf: newOption, element: undefined })}
        fieldKey="displayName"
        placeholder="Select Shelf" />
    },
    {
      size: "half",
      id: "item-shelf-element-id",
      label: "Shelf Element",
      input: <ShelfElementSelect
        open={showElementSelect}
        onOpenChange={setShowElementSelect}
        shelf={values.shelf}
        selectedElement={values.element}
        onElementChange={element => set({ element })}
      >
        <Button
          variant="outline"
          aria-expanded={showElementSelect}
          className="justify-between truncate px-3"
        >
          {values.element ? values.element.id : "Select Shelf Element"}
        </Button>
      </ShelfElementSelect>
    },
    {
      size: "full",
      id: "item-consumable",
      label: "Consumable",
      input: <div className="flex items-center gap-2">
        <Checkbox
          id="item-consumable"
          checked={values.isConsumable}
          onCheckedChange={checked => set({ isConsumable: checked === true })}
        />
        <Label htmlFor="item-consumable" className="font-normal cursor-pointer">
          This item is consumable (not returned after use)
        </Label>
      </div>
    }
  ]

  // The request fields shared by create and update; call only after validate().
  const toPayload = () => ({
    name: values.name.trim(),
    amount: values.amount,
    isConsumable: values.isConsumable,
    shelfUnitId: values.element!.id,
  })

  return { values, elements, validate, toPayload, reset: (next: ItemFormValues = EMPTY_ITEM_FORM) => setValues(next) }
}

export default useItemForm
