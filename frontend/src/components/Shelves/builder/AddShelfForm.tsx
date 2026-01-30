import Combobox from "@/components/primitives/Combobox"
import { Button } from "@/components/shadcn/button"
import { Input } from "@/components/shadcn/input"
import useFetchBuildings from "@/hooks/fetch/useFetchBuildings"
import useFetchRooms from "@/hooks/fetch/useFetchRooms"
import usePostShelf from "@/hooks/post/usePostShelf"
import type { ShelfColumn } from "@/types/shelf"
import { useState } from "react"
import type { FormElement } from "@/components/primitives/types/FormElement"
import FormLayout from "@/components/primitives/FormLayout"
import { Field } from "@/components/shadcn/field"
import { DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/shadcn/dialog"
import type { Building } from "@/types/building"
import type { Room } from "@/types/room"


function AddShelfForm({ columns }: { columns: ShelfColumn[] }) {
  const { status: statusRooms, data: rooms, error: errorRooms } = useFetchRooms()
  const { status: statusBuildings, data: buildings, error: errorBuildings } = useFetchBuildings()

  const [name, setName] = useState("")
  const [selectedBuilding, setSelectedBuilding] = useState<Building | undefined>()
  const [selectedRoom, setSelectedRoom] = useState<Room | undefined>()

  const { status: statusPost, error: errorPost, send } = usePostShelf()

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (selectedRoom == undefined) return
    send(columns, name, selectedRoom.id)
  }

  const elements: FormElement[] = [
    {
      size: "full",
      id: "shelf-name",
      label: "Name",
      input: <Input
        id="shelf-name"
        value={name}
        onChange={e => { setName(e.target.value) }}
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
        selectedOption={selectedBuilding}
        onOptionChange={newOption => setSelectedBuilding(newOption)}
        placeholder="Select Building"
      />
    },
    {
      size: "half",
      id: "shelf-room",
      label: "Room",
      input: <Combobox
        options={rooms?.filter(room => room === selectedRoom) ?? undefined}
        selectedOption={selectedRoom}
        onOptionChange={newOption => setSelectedRoom(newOption)}
        placeholder="Select Room"
        disabled={rooms?.filter(room => room.building === selectedBuilding).length == 0}    
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
              <p className="text-sm text-destructive">{errorPost.message}</p>
            ) : null}
            {statusPost === "success" ? (
              <p className="text-sm text-muted-foreground">Shelf saved successfully.</p>
            ) : null}
          </Field>
        </DialogFooter>
      </form>
    </DialogContent>
  )
}

export default AddShelfForm
