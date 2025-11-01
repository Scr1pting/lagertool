import { useState, type ReactNode } from "react"
import RegularPage from "@/components/RegularPage"
import DataTable from "@/components/DataTable/DataTable"
import roomColumns from "@/components/DataTable/RoomColumns"
import buildingColumns from "@/components/DataTable/BuildingColumns"
import { Button } from "@/components/shadcn/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/shadcn/card"
import { Input } from "@/components/shadcn/input"
import { Label } from "@/components/shadcn/label"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/shadcn/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/shadcn/select"
import { inventoryColumnsNoCart } from "@/components/DataTable/InventoryTable/InventoryColumns"
import useBuilding from "@/hooks/useFetchBuildings"
import useFetchRooms from "@/hooks/useFetchRooms"
import useInventory from "@/hooks/useFetchInventory"
import type { ColumnDef } from "@tanstack/react-table"
import type { Room } from "@/types/room"
import type { Building } from "@/types/building"
import type { InventoryItem } from "@/types/inventory"
import type { Shelf } from "@/types/shelf"
import useFetchShelves from "@/hooks/useFetchShelves"
import { Link } from "react-router-dom"
import { ArrowUpRightIcon } from "lucide-react"
import shelfColumns from "@/components/DataTable/ShelfColumns"


// MARK: ManageInventoryWrapper
interface ManageInventoryWrapperProps<T> {
  type: "item" | "shelf" | "room" | "building"
  children: ReactNode
  tableItems: T[] | undefined
  columnDef: ColumnDef<T>[]
}

function ManageInventoryWrapper<T>({ type, children, tableItems, columnDef }: ManageInventoryWrapperProps<T>) {
  return(
    <TabsContent value={type}>
      <div className="space-y-10">
        <Card>
          <CardHeader>
            <CardTitle className="capitalize">Add {type}</CardTitle>
          </CardHeader>
          {children}
        </Card>
        <section className="space-y-3">
          <h2 className="text-xl font-semibold">
            Recently Added
          </h2>
          <DataTable data={tableItems == undefined ? [] : tableItems} columns={columnDef} />
        </section>
      </div>
    </TabsContent>
  )
}



// MARK: ManageInventoryElements
interface ManageInventoryElement {
  size: "full" | "half"
  label: string
  id: string,
  input: ReactNode
}

interface ManageInventoryElementsProps<T> {
  type: "item" | "shelf" | "room" | "building"
  elements: ManageInventoryElement[]
  tableItems: T[] | undefined
  columnDef: ColumnDef<T>[]
}

function ManageInventoryElements<T>({ type, elements, tableItems, columnDef }: ManageInventoryElementsProps<T>) {
  return (
    <ManageInventoryWrapper
    type={type}
    tableItems={tableItems}
    columnDef={columnDef} >
      <CardContent className={`grid gap-4 sm:grid-cols-2`}>
        {elements.map((element) =>
          <div key={element.id} className={`grid gap-2 ${element.size === 'full' ? 'sm:col-span-2' : ''}`}>
            <Label htmlFor={element.id}>{element.label}</Label>
            {element.input}
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-end">
        <Button type="button">Save</Button>
      </CardFooter>
    </ManageInventoryWrapper>
  )
}


// MARK: LabeledSelect
interface LabeledSelect<T extends { id: string, name: string}> {
  id: string
  value: string | undefined
  options: T[]
  onValueChange: (arg0: string) => void
  disabled?: boolean
}

function LabeledSelect<T extends { id: string, name: string}>({ id, value, options, onValueChange, disabled = false }: LabeledSelect<T>) {
  return(
    <Select
      value={value}
      onValueChange={onValueChange}
      disabled={disabled}
    >
      <SelectTrigger id={id}>
        <SelectValue placeholder="Select building" />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.id} value={option.id}>
            {option.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}


// MARK: AddItem
interface AddItemProps {
  buildings: Building[]
  rooms: Room[]
  shelves: Shelf[]
  inventory: InventoryItem[]
}

function AddItem({ buildings, rooms, shelves, inventory }: AddItemProps) {
  const [name, setName] = useState("")
  const [amount, setAmount] = useState(1)

  const [buildingId, setBuildingId] = useState<string | undefined>()
  const [roomId, setRoomId] = useState<string | undefined>()
  const [shelfId, setShelfId] = useState<string | undefined>()
  const [shelfElementId, setShelfElementId] = useState<string | undefined>()

  const elements: ManageInventoryElement[] = [
    {
      size: "full",
      id: "item-name",
      label: "Name",
      input: <Input
        id="item-name"
        placeholder="Microphone"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
    },
    {
      size: "full",
      id: "item-amount",
      label: "Amount",
      input: <Input
        id="item-amount"
        type="number"
        min="1"
        placeholder="e.g. 15"
        value={amount}
        onChange={(e) => setAmount(Number.parseInt(e.target.value, 10))}
      />
    },
    {
      size: "half",
      id: "item-building-id",
      label: "Building",
      input: <LabeledSelect
        id="item-building-id"
        value={buildingId}
        options={buildings}
        onValueChange={(value) => setBuildingId(value) }
      />
    },
    {
      size: "half",
      id: "item-room-id",
      label: "Room",
      input: <LabeledSelect
        id="item-room-id"
        value={roomId}
        options={rooms}
        onValueChange={(value) => setRoomId(value) }
      />
    },
    {
      size: "half",
      id: "item-shelf-id",
      label: "Shelf",
      input: <LabeledSelect
        id="item-shelf-id"
        value={shelfId}
        options={shelves}
        onValueChange={(value) => setShelfId(value) }
      />
    },
    {
      size: "half",
      id: "item-shelf-element-id",
      label: "Shelf Element",
      input: <LabeledSelect
        id="item-shelf-element-id"
        value={shelfElementId}
        options={buildings}
        onValueChange={(value) => setShelfElementId(value) }
      />
    }
  ]

  return (
    <ManageInventoryElements 
      type={"item"}
      elements={elements}
      tableItems={inventory}
      columnDef={inventoryColumnsNoCart}
    />
  )
}



// MARK: AddShelf
interface AddShelfProps {
  shelves: Shelf[]
}

function AddShelf({ shelves }: AddShelfProps) {
  return (
    <ManageInventoryWrapper 
      type={"shelf"}
      tableItems={shelves}
      columnDef={shelfColumns}
    >
      <CardContent className="flex flex-col items-center justify-center py-12">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">
            Shelves can be added in the dedicated Shelf Builder.
          </p>
          <Button asChild>
            <Link to="/add-shelf" className="inline-flex items-center gap-2">
              Go to Shelf Builder
              <ArrowUpRightIcon className="size-4" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </ManageInventoryWrapper>
  )
}



// MARK: AddRoom
interface AddRoomProps {
  buildings: Building[]
  rooms: Room[]
}

function AddRoom({ buildings, rooms }: AddRoomProps) {
  const [name, setName] = useState<string>("")
  const [buildingId, setBuildingId] = useState<string | undefined>()

  const elements: ManageInventoryElement[] = [
    {
      size: "full",
      id: "room-name",
      label: "Room Name",
      input: <Input
        id="room-name"
        placeholder="Office"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
    },
    {
      size: "full",
      id: "room-building-id",
      label: "Building",
      input: <LabeledSelect
        id="room-building-id"
        value={buildingId}
        options={buildings}
        onValueChange={(value) => setBuildingId(value) }
      />
    }
  ]

  return (
    <ManageInventoryElements 
      type={"room"}
      elements={elements}
      tableItems={rooms}
      columnDef={roomColumns}
    />
  )
}



// MARK: AddBuilding
interface AddBuildingProps {
  buildings: Building[]
}

function AddBuilding({ buildings }: AddBuildingProps) {
  const [name, setName] = useState<string>("")

  const elements: ManageInventoryElement[] = [
    {
      size: "full",
      id: "building-name",
      label: "Room Name",
      input: <Input
        id="building-name"
        placeholder="CAB"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
    }
  ]

  return (
    <ManageInventoryElements 
      type={"building"}
      elements={elements}
      tableItems={buildings}
      columnDef={buildingColumns}
    />
  )
}



// MARK: ManageInventory
function ManageInventory() {
  const { data: buildings } = useBuilding()
  const { data: rooms } = useFetchRooms()
  const { data: shelves } = useFetchShelves()
  const { data: inventory } = useInventory()

  return (
    <RegularPage title="Manage Inventory">
      <div className="w-full max-w-3xl">
        <Tabs defaultValue="item" className="space-y-2">
          <TabsList className="grid w-full grid-cols-4 gap-2 text-sm">
            <TabsTrigger value="item">
              Item
            </TabsTrigger>
            <TabsTrigger value="shelf">
              Shelf
            </TabsTrigger>
            <TabsTrigger value="room">
              Room
            </TabsTrigger>
            <TabsTrigger value="building">
              Building
            </TabsTrigger>
          </TabsList>

          <AddItem
            buildings={buildings ?? []}
            rooms={rooms ?? []}
            shelves={shelves ?? []}
            inventory={inventory ?? []}
          />

          <AddShelf shelves={shelves ?? []} />

          <AddRoom buildings={buildings ?? []} rooms={rooms ?? []} />

          <AddBuilding buildings={buildings ?? []} />
        </Tabs>
      </div>
    </RegularPage>
  )
}

export default ManageInventory
