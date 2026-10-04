import FormLayout from "@/components/primitives/FormLayout"
import type { FormElement } from "@/components/primitives/types/FormElement"
import { Button } from "@/components/shadcn/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/shadcn/dialog"
import { Textarea } from "@/components/shadcn/textarea"
import type { BorrowRequest } from "@/types/borrowRequest"
import post from "@/api/post"
import { useState } from "react"
import { toast } from "sonner"

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''

interface ReviewRequestProps {
  request: BorrowRequest
  outcome: "approved" | "rejected"
  onReviewed: () => void
}

// Approve/reject dialog. The optional message is shown to the author in the request chat.
function ReviewRequest({ request, outcome, onReviewed }: ReviewRequestProps) {
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const verb = outcome === "approved" ? "Approve" : "Reject"

  const elements: FormElement[] = [
    {
      size: "full",
      id: `request-message-${outcome}`,
      label: "Message",
      input: <Textarea
        id={`request-message-${outcome}`}
        placeholder="Add a message to the borrow request author"
        value={message}
        onChange={e => setMessage(e.target.value)}
      />
    }
  ]

  const submit = async () => {
    setSubmitting(true)
    try {
      await post(`${API_BASE_URL}/requests/${request.id}/review`, { outcome, note: message })
    } catch (err) {
      toast.error(`Could not ${verb.toLowerCase()} request`, {
        description: err instanceof Error ? err.message : undefined,
      })
      setSubmitting(false)
      return
    }
    setSubmitting(false)
    setOpen(false)
    setMessage("")
    toast(`${outcome === "approved" ? "Approved" : "Rejected"} borrow request`, { description: request.title })
    onReviewed()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          {verb}
        </Button>
      </DialogTrigger>
      <DialogContent className="w-100">
        <DialogHeader>
          <DialogTitle>{verb} Borrow Request</DialogTitle>
          <DialogDescription>{request.title}</DialogDescription>
        </DialogHeader>

        <FormLayout elements={elements} />

        <DialogFooter>
          <Button
            variant={outcome === "rejected" ? "destructive" : "default"}
            onClick={submit}
            disabled={submitting}
          >
            {submitting ? "Submitting…" : verb}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default ReviewRequest
