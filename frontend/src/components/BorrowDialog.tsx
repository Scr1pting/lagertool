import { Button } from "@/components/shadcn/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/shadcn/dialog"
import { Field } from "@/components/shadcn/field"
import { Input } from "@/components/shadcn/input"
import { Label } from "@/components/shadcn/label"
import { Textarea } from "@/components/shadcn/textarea"
import { useDateParams } from "@/hooks/useDateParams"
import { formatDate } from "@/lib/formatDate"
import { parseISO } from "date-fns"
import { useState, type FormEvent, type ReactNode } from "react"

// yyyy-MM-dd as a local date (new Date() would read it as UTC midnight).
const formatDay = (day: string) => formatDate(parseISO(day))

export interface BorrowDetails {
  title: string
  description: string
  startDate: string  // yyyy-MM-dd
  endDate: string
}

// ok: the request was created. Otherwise problem, if any, is shown in the dialog.
export type BorrowResult = { ok: true } | { ok: false, problem?: ReactNode }

interface BorrowDialogProps {
  onSubmit: (details: BorrowDetails) => Promise<BorrowResult>
  children: ReactNode
}

// Asks for a title and an optional description before a request is created.
// The period is the date range picked in the nav bar (today if none).
function BorrowDialog({ onSubmit, children }: BorrowDialogProps) {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [problem, setProblem] = useState<ReactNode>(null)
  const { startDate, endDate } = useDateParams()

  const isComplete = title.trim() !== ""

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!isComplete) return
    setSubmitting(true)
    const result = await onSubmit({ title: title.trim(), description: description.trim(), startDate, endDate })
    setSubmitting(false)
    if (result.ok) {
      setOpen(false)
      setTitle("")
      setDescription("")
      setProblem(null)
    } else {
      setProblem(result.problem ?? null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={newOpen => { setOpen(newOpen); setProblem(null) }}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={submit} className="grid gap-5">
          <DialogHeader>
            <DialogTitle>Borrow</DialogTitle>
            <DialogDescription>
              {startDate === endDate
                ? <>Borrowing on <b>{formatDay(startDate)}</b></>
                : <>Borrowing from <b>{formatDay(startDate)} – {formatDay(endDate)}</b></>}
              {" "}(change using the date picker next to search)
            </DialogDescription>
          </DialogHeader>

          <Field>
            <Label htmlFor="borrow-title">Title</Label>
            <Input
              id="borrow-title"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Soldering workshop"
            />
          </Field>

          <Field>
            <Label htmlFor="borrow-description">Description (optional)</Label>
            <Textarea
              id="borrow-description"
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
          </Field>

          {problem && <div className="text-sm text-destructive">{problem}</div>}

          <DialogFooter>
            <Button type="submit" disabled={!isComplete || submitting}>
              {submitting ? "Submitting…" : "Submit Borrow Request"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default BorrowDialog
