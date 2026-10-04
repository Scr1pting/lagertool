import FormLayout from "@/components/primitives/FormLayout"
import type { FormElement } from "@/components/primitives/types/FormElement"
import { Button } from "@/components/shadcn/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/shadcn/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/shadcn/select"
import { Textarea } from "@/components/shadcn/textarea"
import type { BorrowRequest } from "@/types/borrowRequest"
import post from "@/api/post"
import { useState } from "react"
import { toast } from "sonner"

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''

type Status = "pending" | "approved"

interface ChangeStatusProps {
  request: BorrowRequest
  onChanged: () => void
}

// Moves a rejected request back to pending, or approves it directly.
function ChangeStatus({ request, onChanged }: ChangeStatusProps) {
  const [open, setOpen] = useState(false)
  const [status, setStatus] = useState<Status>("pending")
  const [message, setMessage] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const elements: FormElement[] = [
    {
      size: "full",
      id: "request-status",
      label: "Status",
      input: <Select value={status} onValueChange={value => setStatus(value as Status)}>
        <SelectTrigger id="request-status">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="pending">Pending</SelectItem>
          <SelectItem value="approved">Approved</SelectItem>
        </SelectContent>
      </Select>
    },
    // Only approving goes through a review, which carries a message to the author.
    ...(status === "approved" ? [{
      size: "full" as const,
      id: "request-message-status",
      label: "Message",
      input: <Textarea
        id="request-message-status"
        placeholder="Add a message to the borrow request author"
        value={message}
        onChange={e => setMessage(e.target.value)}
      />
    }] : []),
  ]

  const submit = async () => {
    setSubmitting(true)
    try {
      if (status === "approved") {
        await post(`${API_BASE_URL}/requests/${request.id}/review`, { outcome: "approved", note: message })
      } else {
        await post(`${API_BASE_URL}/requests/${request.id}/revert`, { from: "rejected" })
      }
    } catch (err) {
      toast.error("Could not change status", {
        description: err instanceof Error ? err.message : undefined,
      })
      setSubmitting(false)
      return
    }
    setSubmitting(false)
    setOpen(false)
    setMessage("")
    toast(`Changed borrow request to ${status}`, { description: request.title })
    onChanged()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          Change status
        </Button>
      </DialogTrigger>
      <DialogContent className="w-100">
        <DialogHeader>
          <DialogTitle>Change Status</DialogTitle>
          <DialogDescription>{request.title}</DialogDescription>
        </DialogHeader>

        <FormLayout elements={elements} />

        <DialogFooter>
          <Button onClick={submit} disabled={submitting}>
            {submitting ? "Submitting…" : "Change status"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default ChangeStatus
