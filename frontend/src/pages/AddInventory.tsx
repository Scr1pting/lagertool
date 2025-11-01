import { useEffect, useMemo, useState } from "react"
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
import type { InventoryItem } from "@/types/inventory"
import type { Room } from "@/types/room"
import type { Building } from "@/types/building"
import { inventoryColumnsNoCart } from "@/components/DataTable/InventoryTable/InventoryColumns"

const recentInventory: InventoryItem[] = [
  {
    item_id: 1,
    item_name: "Wireless Microphone",
    amount: 12,
    available: 9,
    building: "HG",
    room: "F 21",
    shelf_id: "HG-F21-SH1",
  },
  {
    item_id: 2,
    item_name: "LED Stage Light",
    amount: 6,
    available: 4,
    building: "HG",
    room: "F 04",
    shelf_id: "HG-F04-SH2",
  },
  {
    item_id: 3,
    item_name: "Camera Tripod",
    amount: 8,
    available: 7,
    building: "LAB",
    room: "102",
    shelf_id: "LAB-102-SH3",
  },
  {
    item_id: 4,
    item_name: "Audio Mixer",
    amount: 3,
    available: 2,
    building: "LAB",
    room: "201",
    shelf_id: "LAB-201-SH4",
  },
  {
    item_id: 5,
    item_name: "Projector",
    amount: 5,
    available: 3,
    building: "HG",
    room: "Auditorium",
    shelf_id: "HG-AUD-SH5",
  },
]

const recentRooms: Room[] = [
  { room_id: 11, name: "Studio A", building: "HG" },
  { room_id: 12, name: "Studio B", building: "HG" },
  { room_id: 13, name: "Control Room", building: "LAB" },
  { room_id: 14, name: "Conference 1", building: "HQ" },
  { room_id: 15, name: "Workshop Bay", building: "Warehouse" },
]

const recentBuildings: Building[] = [
  { building_id: 21, name: "HG" },
  { building_id: 22, name: "LAB" },
  { building_id: 23, name: "Warehouse" },
  { building_id: 24, name: "HQ" },
  { building_id: 25, name: "Annex" },
]

function AddInventory() {
  const [buildings, setBuildings] = useState<Building[]>([])
  const [rooms, setRooms] = useState<Room[]>([])
  const [inventoryBuildingId, setInventoryBuildingId] = useState<string>("")
  const [inventoryRoomId, setInventoryRoomId] = useState<string>("")
  const [roomBuildingId, setRoomBuildingId] = useState<string>("")

  useEffect(() => {
    // TODO: replace with real API calls when backend endpoints are ready
    setBuildings(recentBuildings)
    setRooms(recentRooms)
  }, [])

  const buildingOptions = useMemo(
    () =>
      buildings.map((building) => ({
        id: building.building_id.toString(),
        label: building.name,
      })),
    [buildings]
  )

  const inventoryRoomOptions = useMemo(
    () =>
      rooms
        .filter((room) => {
          const selectedBuilding = buildings.find(
            (building) => building.building_id.toString() === inventoryBuildingId
          )
          if (!selectedBuilding) return true
          return room.building === selectedBuilding.name
        })
        .map((room) => ({
          id: room.room_id.toString(),
          label: room.name,
          building: room.building,
        })),
    [rooms, buildings, inventoryBuildingId]
  )

  return (
    <RegularPage title="Add Inventory">
      <div className="flex w-full max-w-3xl flex-col gap-6">
        <Tabs defaultValue="inventory">
          <TabsList className="grid w-full grid-cols-3 gap-2 self-center">
            <TabsTrigger value="inventory" className="text-sm">
              Inventory
            </TabsTrigger>
            <TabsTrigger value="room" className="text-sm">
              Room
            </TabsTrigger>
            <TabsTrigger value="building" className="text-sm">
              Building
            </TabsTrigger>
          </TabsList>

          <TabsContent value="inventory">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Create Inventory Item</CardTitle>
                  <CardDescription>
                    Provide item details below and save to add it to the
                    catalog.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 sm:grid-cols-2">
                  <div className="grid gap-2 sm:col-span-2">
                    <Label htmlFor="inventory-name">Name</Label>
                    <Input id="inventory-name" placeholder="Microphone" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="inventory-amount">Amount</Label>
                    <Input
                      id="inventory-amount"
                      type="number"
                      min="0"
                      placeholder="e.g. 15"
                    />
                  </div>
                  <div className="grid gap-2 sm:col-span-2">
                  <Label htmlFor="inventory-building">Building</Label>
                    <Select
                      value={inventoryBuildingId || undefined}
                      onValueChange={(value) => {
                        setInventoryBuildingId(value)
                        setInventoryRoomId("")
                      }}
                    >
                      <SelectTrigger id="inventory-building">
                        <SelectValue placeholder="Select building" />
                      </SelectTrigger>
                      <SelectContent>
                        {buildingOptions.map((building) => (
                          <SelectItem key={building.id} value={building.id}>
                            {building.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2 sm:col-span-2">
                  <Label htmlFor="inventory-room">Room</Label>
                    <Select
                      value={inventoryRoomId || undefined}
                      onValueChange={setInventoryRoomId}
                      disabled={!inventoryBuildingId && inventoryRoomOptions.length !== 0}
                    >
                      <SelectTrigger id="inventory-room">
                        <SelectValue
                          placeholder={
                            inventoryBuildingId
                              ? "Select room"
                              : "Select building first"
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {inventoryRoomOptions.map((room) => (
                          <SelectItem key={room.id} value={room.id}>
                            {room.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-end">
                  <Button type="button">Save inventory item</Button>
                </CardFooter>
              </Card>
              <section className="space-y-3">
                <h3 className="text-sm font-medium text-muted-foreground">
                  Recently added inventory
                </h3>
                <DataTable data={recentInventory} columns={inventoryColumnsNoCart} />
              </section>
            </div>
          </TabsContent>

          <TabsContent value="room">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Create Room</CardTitle>
                  <CardDescription>
                    Add a new room to use as a location for inventory items.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 sm:grid-cols-2">
                  <div className="grid gap-2 sm:col-span-2">
                    <Label htmlFor="room-name">Room Name</Label>
                    <Input id="room-name" placeholder="Studio A" />
                  </div>
                  <div className="grid gap-2 sm:col-span-2">
                  <Label htmlFor="room-building">Building</Label>
                    <Select
                      value={roomBuildingId || undefined}
                      onValueChange={(value) => {
                        setRoomBuildingId(value)
                      }}
                    >
                      <SelectTrigger id="room-building">
                        <SelectValue placeholder="Select building" />
                      </SelectTrigger>
                      <SelectContent>
                        {buildingOptions.map((building) => (
                          <SelectItem key={building.id} value={building.id}>
                            {building.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-end">
                  <Button type="button">Save room</Button>
                </CardFooter>
              </Card>
              <section className="space-y-3">
                <h3 className="text-sm font-medium text-muted-foreground">
                  Recently added rooms
                </h3>
                <DataTable data={recentRooms} columns={roomColumns} />
              </section>
            </div>
          </TabsContent>

          <TabsContent value="building">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Create Building</CardTitle>
                  <CardDescription>
                    Capture basic building information for organizational use.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid w-full gap-4 sm:max-w-sm sm:self-center">
                  <div className="grid gap-2">
                    <Label htmlFor="building-name">Building Name</Label>
                    <Input id="building-name" placeholder="HG" />
                  </div>
                </CardContent>
                <CardFooter className="flex justify-end">
                  <Button type="button">Save building</Button>
                </CardFooter>
              </Card>
              <section className="space-y-3">
                <h3 className="text-sm font-medium text-muted-foreground">
                  Recently added buildings
                </h3>
                <DataTable data={recentBuildings} columns={buildingColumns} />
              </section>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </RegularPage>
  )
}

export default AddInventory
