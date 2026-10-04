import FormLayout from "@/components/primitives/FormLayout"
import { Button } from "@/components/shadcn/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/shadcn/dialog"
import useFetchShelves from "@/hooks/fetch/useFetchShelves"
import useOrgs from "@/store/useOrgs"
import type { InventoryItemFull } from "@/types/inventory"
import { formatDate } from "@/lib/formatDate"
import axios from "axios"
import { useState, type ReactNode } from "react"
import { toast } from "sonner"
import useItemForm, { findShelfElement } from "./useItemForm"

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''

// The backend's 409 when the new amount is below what requests hold at once.
interface AmountConflict {
  error: string
  committed: number
  affected: { id: number, title: string, author: string, startDate: string, endDate: string, amount: number }[]
}

function isAmountConflict(data: unknown): data is AmountConflict {
  return typeof data === "object" && data !== null && "committed" in data && "affected" in data
}

interface EditItemDialogProps {
  item: InventoryItemFull
  onSaved: () => void
  children: ReactNode
}

// Edits an item with the same fields as the add form in Manage Inventory.
function EditItemDialog({ item, onSaved, children }: EditItemDialogProps) {
  const [open, setOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [conflict, setConflict] = useState<AmountConflict | null>(null)
  const shelves = useFetchShelves().data ?? []
  const { values, elements, validate, toPayload, reset } = useItemForm(shelves)
  const selectedOrg = useOrgs(s => s.selectedOrg)

  // Start from the item's current values each time the dialog opens.
  function handleOpenChange(newOpen: boolean) {
    if (newOpen) {
      // Prefer the listed shelf: the combobox shows its displayName.
      const shelf = shelves.find(s => s.id === item.shelf.id) ?? item.shelf
      reset({
        name: item.name,
        amount: item.amount,
        isConsumable: item.isConsumable,
        shelf,
        element: findShelfElement(shelf, item.shelfElementId),
      })
    }
    setConflict(null)
    setOpen(newOpen)
  }

  // force saves even when the amount drops below what requests hold.
  const submit = async (force = false) => {
    if (!validate()) return
    if (!selectedOrg) { toast.error("No organisation selected"); return }

    setSubmitting(true)
    try {
      await axios.put(`${API_BASE_URL}/organisations/${selectedOrg.name}/items/${item.id}`, {
        ...toPayload(),
        force,
      })
    } catch (err) {
      const data = axios.isAxiosError(err) ? err.response?.data : undefined
      if (isAmountConflict(data)) {
        setConflict(data)
      } else {
        toast.error("Could not save item", {
          description: data?.error ?? (err instanceof Error ? err.message : undefined),
        })
      }
      setSubmitting(false)
      return
    }
    setSubmitting(false)
    setConflict(null)
    setOpen(false)
    toast("Saved item", { description: values.name.trim() })
    onSaved()
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Edit Item</DialogTitle>
          <DialogDescription>{item.name}</DialogDescription>
        </DialogHeader>

        {conflict
          ? <>
            <div className="text-sm space-y-3">
              <p>
                Requests hold {conflict.committed} at once, but you're setting the amount
                to {values.amount}. They may not all get their items.
              </p>
              <ul className="space-y-1">
                {conflict.affected.map(request =>
                  <li key={request.id} className="flex justify-between gap-3">
                    <span className="truncate">
                      {request.title || "Untitled"} <span className="text-muted-foreground">· {request.author}</span>
                    </span>
                    <span className="shrink-0 text-muted-foreground">
                      {request.amount}× · {formatDate(request.startDate)} → {formatDate(request.endDate)}
                    </span>
                  </li>
                )}
              </ul>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setConflict(null)} disabled={submitting}>
                Back
              </Button>
              <Button variant="destructive" onClick={() => submit(true)} disabled={submitting}>
                {submitting ? "Saving…" : "Save anyway"}
              </Button>
            </DialogFooter>
          </>
          : <>
            <FormLayout elements={elements} />

            <DialogFooter>
              <Button onClick={() => submit()} disabled={submitting}>
                {submitting ? "Saving…" : "Save"}
              </Button>
            </DialogFooter>
          </>
        }
      </DialogContent>
    </Dialog>
  )
}

export default EditItemDialog
