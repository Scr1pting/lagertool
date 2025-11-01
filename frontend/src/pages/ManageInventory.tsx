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


// MARK: ManageInventoryPage
interface ManageInventoryElement {
  size: "full" | "half"
  label: string
  id: string,
  input: ReactNode
}

interface ManageInventoryProps<T> {
  type: "inventory" | "shelf" | "room" | "building"
  description?: string | undefined
  elements: ManageInventoryElement[]
  tableItems: T[] | undefined
  columnDef: ColumnDef<T>[]
}

function ManageInventoryPage<T>({ type, description, elements, tableItems, columnDef }: ManageInventoryProps<T>) {
  return(
    <TabsContent value={type}>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="capitalize">Add {type}</CardTitle>
            <CardDescription>
              {description}
            </CardDescription>
          </CardHeader>
          <CardContent className={`grid gap-4 sm:grid-cols-2`}>
            {elements.map((element) =>
              <div key={element.id} className={`grid gap-2 ${element.size === 'full' ? 'sm:col-span-2' : ''}`}>
                <Label htmlFor={element.id}>{element.label}</Label>
                {element.input}
              </div>
            )}
          </CardContent>
          <CardFooter className="flex justify-end">
            <Button type="button">Save inventory item</Button>
          </CardFooter>
        </Card>
        <section className="space-y-3">
          <h2 className="text-muted-foreground">
            Recently Added {type}
          </h2>
          <DataTable data={tableItems == undefined ? [] : tableItems} columns={columnDef} />
        </section>
      </div>
    </TabsContent>
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


// MARK: AddInventory
interface AddInventoryProps {
  buildings: Building[]
  rooms: Room[]
  shelves: Shelf[]
  inventory: InventoryItem[]
}

function AddInventory({ buildings, rooms, shelves, inventory }: AddInventoryProps) {
  const [name, setName] = useState("")
  const [amount, setAmount] = useState(1)

  const [buildingId, setBuildingId] = useState<string | undefined>()
  const [roomId, setRoomId] = useState<string | undefined>()
  const [shelfId, setShelfId] = useState<string | undefined>()
  const [shelfElementId, setShelfElementId] = useState<string | undefined>()

  const elements: ManageInventoryElement[] = [
    {
      size: "full",
      id: "inventory-name",
      label: "Name",
      input: <Input
        id="inventory-name"
        placeholder="Microphone"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
    },
    {
      size: "full",
      id: "inventory-amount",
      label: "Amount",
      input: <Input
        id="inventory-amount"
        type="number"
        min="1"
        placeholder="e.g. 15"
        value={amount}
        onChange={(e) => setAmount(Number.parseInt(e.target.value, 10))}
      />
    },
    {
      size: "half",
      id: "inventory-building-id",
      label: "Building",
      input: <LabeledSelect
        id="inventory-building-id"
        value={buildingId}
        options={buildings}
        onValueChange={(value) => setBuildingId(value) }
      />
    },
    {
      size: "half",
      id: "inventory-room-id",
      label: "Room",
      input: <LabeledSelect
        id="inventory-room-id"
        value={roomId}
        options={rooms}
        onValueChange={(value) => setRoomId(value) }
      />
    },
    {
      size: "half",
      id: "inventory-shelf-id",
      label: "Shelf",
      input: <LabeledSelect
        id="inventory-shelf-id"
        value={shelfId}
        options={shelves}
        onValueChange={(value) => setShelfId(value) }
      />
    },
    {
      size: "half",
      id: "inventory-shelf-element-id",
      label: "Shelf Element",
      input: <LabeledSelect
        id="inventory-shelf-element-id"
        value={shelfElementId}
        options={buildings}
        onValueChange={(value) => setShelfElementId(value) }
      />
    }
  ]

  return (
    <ManageInventoryPage 
      type={"inventory"}
      elements={elements}
      tableItems={inventory}
      columnDef={inventoryColumnsNoCart}
    />
  )
}



// MARK: AddShelf




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
    <ManageInventoryPage 
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
    <ManageInventoryPage 
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
        <Tabs defaultValue="inventory">
          <TabsList className="grid w-full grid-cols-3 gap-2 text-sm">
            <TabsTrigger value="inventory">
              Inventory
            </TabsTrigger>
            <TabsTrigger value="room">
              Room
            </TabsTrigger>
            <TabsTrigger value="building">
              Building
            </TabsTrigger>
          </TabsList>

          <AddInventory
            buildings={buildings ?? []}
            rooms={rooms ?? []}
            shelves={shelves ?? []}
            inventory={inventory ?? []}
          />

          <AddRoom buildings={buildings ?? []} rooms={rooms ?? []} />

          <AddBuilding buildings={buildings ?? []} />
        </Tabs>
      </div>
    </RegularPage>
  )
}

export default ManageInventory
