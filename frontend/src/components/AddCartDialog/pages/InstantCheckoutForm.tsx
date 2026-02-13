import type { FormEvent } from "react"
import { Button } from "../../temp/button"
import { DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../../temp/dialog"
import { Field } from "../../temp/field"
import { Input } from "../../temp/input"
import { Label } from "../../temp/label"
import { Textarea } from "../../temp/textarea"


interface InstantCheckoutFormProps {
  title: string,
  setTitle: React.Dispatch<React.SetStateAction<string>>
  description: string
  setDescription: React.Dispatch<React.SetStateAction<string>>
  onBack: () => void
  onProceed: () => void
}

function InstantCheckoutForm({
  title, setTitle, description, setDescription, onBack, onProceed
}: InstantCheckoutFormProps) {
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (title !== "") {
      onProceed()
    }
  }

  return(
    <form onSubmit={handleSubmit} className="grid gap-5">
      <DialogHeader>
        <DialogTitle>Direct Checkout</DialogTitle>
        <DialogDescription>
          Please add some info to your request.
        </DialogDescription>
      </DialogHeader>
      <Field>
        <Label htmlFor="title">Title (Required)</Label>
        <Input
          id="title"
          name="title"
          type="text"
          value={title}
          onChange={e => { setTitle(e.target.value) }}
        />
      </Field>

      <Field>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          name="description"
          value={description}
          onChange={e => { setDescription(e.target.value) }}
        />
      </Field>

      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
        >
          Back
        </Button>

        <Button
          disabled={title === ""}
          type="submit"
        >
          Next
        </Button>
      </DialogFooter>
    </form>
  )
}

export default InstantCheckoutForm
