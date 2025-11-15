import { Combobox } from "@/components/primitives/Combobox"
import { Button } from "@/components/shadcn/button"
import { Input } from "@/components/shadcn/input"
import useFetchBuildings from "@/hooks/fetch/useFetchBuildings"
import useFetchRooms from "@/hooks/fetch/useFetchRooms"
import usePostShelf from "@/hooks/post/usePostShelf"
import type { ShelfColumn } from "@/types/shelf"
import { useState } from "react"
import type { FormElement } from "@/components/primitives/types/FormElement"
import FormLayout from "@/components/primitives/FormLayout"
import { Field, FieldGroup } from "@/components/shadcn/field"
import { DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/shadcn/dialog"


function AddShelfForm({ columns }: { columns: ShelfColumn[] }) {
  const { status: statusRooms, data: rooms, error: errorRooms } = useFetchRooms()
  const { status: statusBuildings, data: buildings, error: errorBuildings } = useFetchBuildings()

  const [name, setName] = useState("")
  const [buildingId, setBuildingId] = useState<number | null>(null)
  const [roomId, setRoomId] = useState<number | null>(null)

  const { status: statusPost, errorPost, send } = usePostShelf()

  const submit = (e) => {
    e.preventDefault()
    if (roomId == null) return
    send(columns, name, roomId)
  }

  const elements: FormElement[] = [
    {
      size: "full",
      id: "shelf-name",
      label: "Name",
      input: <Input
        id="shelf-name"
        value={name}
        onChange={(e) => { setName(e.target.value) }}
        placeholder="Library Shelf"
        className="col-span-2 h-8"
        required
      />
    },
    {
      size: "half",
      id: "shelf-building",
      label: "Building",
      input: <Combobox
        options={buildings}
        selectedId={buildingId}
        setSelectedId={setBuildingId}
        placeholder="Select Building"
      />
    },
    {
      size: "half",
      id: "shelf-room",
      label: "Room",
      input: <Combobox
        options={rooms?.filter((room) => room.buildingId === buildingId) ?? null}
        selectedId={roomId}
        setSelectedId={setRoomId}
        placeholder="Select Room"
        disabled={rooms?.filter((room) => room.buildingId === buildingId).length == 0}    
      />
    }
  ]

  return (
    <DialogContent className="w-100">
      <form onSubmit={submit} className="grid gap-5">
        <DialogHeader>
          <DialogTitle>Add Shelf</DialogTitle>
        </DialogHeader>

        <FormLayout elements={elements} />
        
        <DialogFooter>
          <Field orientation="horizontal" className="justify-end">
            <Button type="submit" className="bg-primary" disabled={statusPost == "loading"}>
            {statusPost === "loading" ? "Submitting..." : "Submit"}
            </Button>
            {statusPost === "error" && errorPost ? (
              <p className="text-sm text-destructive">{errorPost}</p>
            ) : null}
            {statusPost === "success" ? (
              <p className="text-sm text-muted-foreground">Shelf saved successfully.</p>
            ) : null}
          </Field>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

export default AddShelfForm
