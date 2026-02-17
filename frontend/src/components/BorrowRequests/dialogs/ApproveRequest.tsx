import FormLayout from "@/components/primitives/FormLayout"
import type { FormElement } from "@/components/primitives/types/FormElement"
import { Button } from "@/components/shadcn/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/shadcn/dialog"
import { Textarea } from "@/components/shadcn/textarea"
import type { BorrowRequest } from "@/types/borrowRequest"
import { useState } from "react"


interface RejectRequestProps {
  request: BorrowRequest
}

function RejectRequest({ request }: RejectRequestProps) {
  const [message, setMessage] = useState("")

  const elements: FormElement[] = [
    {
      size: "full",
      id: "request-message",
      label: "Message",
      input: <Textarea
        id="request-message"
        placeholder="Add a message to the borrow request author"
        value={message}
        onChange={e => setMessage(e.target.value)}
      />
    }
  ]

  return (
    <Dialog>
      <DialogTrigger>
        <Button variant="outline">
          Approve
        </Button>
      </DialogTrigger>
      <DialogContent className="w-100">
        <DialogHeader>
          <DialogTitle>Approve Borrow Request</DialogTitle>
          <DialogDescription>{request.title}</DialogDescription>
        </DialogHeader>

        <FormLayout elements={elements} />

        <DialogFooter>
          <Button>Approve</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default RejectRequest
