import { Button } from "@/components/shadcn/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/shadcn/dialog"
import type { BorrowRequest } from "@/types/borrowRequest"
import post from "@/api/post"
import put from "@/api/put"
import { useState } from "react"
import { toast } from "sonner"

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''

interface Action {
  label: string   // the button
  title: string   // the dialog's headline
  done: string
  submit: (id: number) => Promise<unknown>
}

const revert = (from: string) => (id: number) => post(`${API_BASE_URL}/requests/${id}/revert`, { from })

const ACTIONS = {
  revertToPending: {
    label: "Revert to pending",
    title: "Revert to Pending",
    done: "Reverted borrow request to pending",
    submit: revert("notPickedUp"),
  },
  pickedUp: {
    label: "Picked up",
    title: "Mark as Picked Up",
    done: "Marked borrow request as picked up",
    submit: (id: number) => post(`${API_BASE_URL}/requests/${id}/pickup`, {}),
  },
  revertToNotBorrowed: {
    label: "Revert to not borrowed",
    title: "Undo Pickup",
    done: "Reverted borrow request to not borrowed",
    submit: revert("borrowed"),
  },
  returned: {
    label: "Returned",
    title: "Mark as Returned",
    done: "Marked borrow request as returned",
    submit: (id: number) => put(`${API_BASE_URL}/requests/${id}/loans`, { returnedAt: new Date().toISOString() }),
  },
  revertToBorrowed: {
    label: "Revert to borrowed",
    title: "Undo Return",
    done: "Reverted borrow request to borrowed",
    submit: revert("returned"),
  },
} satisfies Record<string, Action>

interface RequestActionProps {
  request: BorrowRequest
  action: keyof typeof ACTIONS
  onDone: () => void
}

// Confirmation dialog for actions on an approved request.
function RequestAction({ request, action, onDone }: RequestActionProps) {
  const [open, setOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const { label, title, done, submit }: Action = ACTIONS[action]

  const confirm = async () => {
    setSubmitting(true)
    try {
      await submit(request.id)
    } catch (err) {
      toast.error(`Could not ${label.toLowerCase()} request`, {
        description: err instanceof Error ? err.message : undefined,
      })
      setSubmitting(false)
      return
    }
    setSubmitting(false)
    setOpen(false)
    toast(done, { description: request.title })
    onDone()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          {label}
        </Button>
      </DialogTrigger>
      <DialogContent className="w-100">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{request.title}</DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button
            variant={action.startsWith("revert") ? "destructive" : "default"}
            onClick={confirm}
            disabled={submitting}
          >
            {submitting ? "Submitting…" : label}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default RequestAction
