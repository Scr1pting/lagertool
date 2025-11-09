import RegularPage from "@/components/RegularPage"
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/shadcn/tabs"
import useBuilding from "@/hooks/useFetchBuildings"
import useFetchRooms from "@/hooks/useFetchRooms"
import useInventory from "@/hooks/useFetchInventory"
import useFetchShelvesMeta from "@/hooks/useFetchShelvesMeta"
import ItemTab from "@/components/ManageInventory/tabs/ItemTab"
import ShelfTab from "@/components/ManageInventory/tabs/ShelfTab"
import RoomTab from "@/components/ManageInventory/tabs/RoomTab"
import BuildingTab from "@/components/ManageInventory/tabs/BuildingTab"


function ManageInventory() {
  const { data: buildings } = useBuilding()
  const { data: rooms } = useFetchRooms()
  const { data: shelves } = useFetchShelvesMeta()
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

          <ItemTab
            buildings={buildings ?? []}
            rooms={rooms ?? []}
            shelves={shelves ?? []}
            inventory={inventory ?? []}
          />

          <ShelfTab shelves={shelves ?? []} />

          <RoomTab buildings={buildings ?? []} rooms={rooms ?? []} />

          <BuildingTab buildings={buildings ?? []} />
        </Tabs>
      </div>
    </RegularPage>
  )
}

export default ManageInventory
