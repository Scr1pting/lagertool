import { type ChangeEvent, type FormEvent, useCallback, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Button } from "@/components/temp/button"
import { ButtonGroup } from "@/components/temp/button-group"
import { FieldGroup, Field } from "@/components/temp/field"
import { Input } from "@/components/temp/input"
import { Label } from "@/components/temp/label"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/temp/popover'
import usePostShelf from "@/hooks/post/usePostShelf"
import { type ShelfColumn } from '../types/shelf'
import { X } from 'lucide-react'


type FormProps = {
  columns: ShelfColumn[];
};

type FormStatus = "idle" | "submitting" | "success" | "error";

type FormValues = {
  name: string;
  building: string;
  room: string;
};

const INITIAL_VALUES: FormValues = {
  name: "",
  building: "CAB",
  room: "",
}

function Form({ columns }: FormProps) {
  const [values, setValues] = useState<FormValues>(INITIAL_VALUES)
  const [status, setStatus] = useState<FormStatus>("idle")
  const [error, setError] = useState<string | null>(null)
  const { status: postStatus, error: postError, send } = usePostShelf()

  const updateValue = useCallback(
    (field: keyof FormValues) =>
      (event: ChangeEvent<HTMLInputElement>) => {
        const nextValue = event.target.value
        setValues(prev => ({ ...prev, [field]: nextValue }))
        if (status === "success") {
          setStatus("idle")
        }
      },
    [status]
  )

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      setError(null)

      if (columns.length === 0) {
        setStatus("error")
        setError("Add at least one shelf before submitting.")
        return
      }

      setStatus("submitting")

      const roomId = Number.parseInt(values.room, 10)
      if (Number.isNaN(roomId)) {
        setStatus("error")
        setError("Enter a numeric room ID.")
        return
      }

      try {
        await send(columns, values.name.trim(), roomId)

        setStatus("success")
        setValues(prev => ({ name: "", building: prev.building, room: "" }))
      } catch (submitError) {
        setStatus("error")
        const message = submitError instanceof Error ? submitError.message : "Something went wrong while saving the shelf."
        setError(message)
      }
    },
    [columns.length, columns, values.building, values.name, values.room]
  )

  const isSubmitDisabled = status === "submitting" || columns.length === 0

  return (
    <form onSubmit={handleSubmit}>
      <FieldGroup className="gap-4">
        <Field>
          <div className="grid grid-cols-3 items-center gap-4">
            <Label htmlFor="shelf-name">Name</Label>
            <Input
              id="shelf-name"
              value={values.name}
              onChange={updateValue("name")}
              placeholder="Library Shelf"
              className="col-span-2 h-8"
              required
            />
          </div>
        </Field>
        <Field>
          <div className="grid grid-cols-3 items-center gap-4">
            <Label htmlFor="building">Building</Label>
            <Input
              id="building"
              value={values.building}
              onChange={updateValue("building")}
              className="col-span-2 h-8"
              required
            />
          </div>
        </Field>
        <Field>
          <div className="grid grid-cols-3 items-center gap-4">
            <Label htmlFor="room">Room</Label>
            <Input
              id="room"
              value={values.room}
              onChange={updateValue("room")}
              placeholder="Office"
              className="col-span-2 h-8"
              required
            />
          </div>
        </Field>
        <Button type="submit" className="bg-primary" disabled={isSubmitDisabled}>
          {postStatus === "loading" || status === "submitting" ? "Submitting..." : "Submit"}
        </Button>
        {(status === "error" && error) || postError ? (
          <p className="text-sm text-destructive">{error ?? postError?.message}</p>
        ) : null}
        {status === "success" || postStatus === "success" ? (
          <p className="text-sm text-muted-foreground">Shelf saved successfully.</p>
        ) : null}
      </FieldGroup>
    </form>
  )
}


type FromLocation = {
  pathname: string;
  search?: string;
  hash?: string;
  state?: unknown;
};

type LocationState = {
  from?: FromLocation;
};

function ActionBar({ columns }: { columns: ShelfColumn[] }) {
  const navigate = useNavigate()
  const location = useLocation()
  const makePath = (from: FromLocation) => `${from.pathname}${from.search ?? ''}${from.hash ?? ''}`

  // Goes to the last page or home.
  // Enables using the browser back btn to return to ShelfBuilder.
  const goBack = () => {
    const fromLocation = (location.state as LocationState | null)?.from
    if (fromLocation) {
      navigate(makePath(fromLocation), {
        replace: false,
        state: fromLocation.state,
      })
      return
    }
    navigate("/", { replace: false })
  }

  return(
    <Popover >
      <ButtonGroup className="fixed top-6 right-6 z-20">
        <ButtonGroup>
          <PopoverTrigger asChild>
            {/* Slightly greys out the Next btn when popover is open*/}
            <Button className="bg-primary transition-colors data-[state=open]:bg-primary/80 data-[state=open]:text-primary-foreground data-[state=open]:hover:bg-primary/70">
              Next
            </Button>
          </PopoverTrigger>
        </ButtonGroup>
        <ButtonGroup>
          <Button variant="outline" onClick={goBack}>
            <X />
          </Button>
        </ButtonGroup>
      </ButtonGroup>

      <PopoverContent align="end" sideOffset={12} className="w-64">
        <Form columns={columns} />
      </PopoverContent>
    </Popover>
  )
}

export default ActionBar
