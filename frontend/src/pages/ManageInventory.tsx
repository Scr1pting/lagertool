import RegularPage from "@/components/RegularPage"
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/temp/tabs"
import useBuilding from "@/hooks/fetch/useFetchBuildings"
import useFetchRooms from "@/hooks/fetch/useFetchRooms"
import useInventory from "@/hooks/fetch/useFetchInventory"
import useFetchShelves from "@/hooks/fetch/useFetchShelves"
import ItemTab from "@/components/ManageInventory/tabs/ItemTab"
import ShelfTab from "@/components/ManageInventory/tabs/ShelfTab"
import RoomTab from "@/components/ManageInventory/tabs/RoomTab"
import BuildingTab from "@/components/ManageInventory/tabs/BuildingTab"


function ManageInventory() {
  const { data: buildings } = useBuilding()
  const { data: rooms } = useFetchRooms()
  const { data: shelves } = useFetchShelves()
  const { data: inventory } = useInventory()

  return (
    <RegularPage title="Manage Inventory">
      <div className="w-full max-w-3xl">
        <Tabs defaultValue="items" className="space-y-2">
          <TabsList className="grid w-full grid-cols-4 gap-2 text-sm">
            <TabsTrigger value="items">
              Items
            </TabsTrigger>
            <TabsTrigger value="shelves">
              Shelves
            </TabsTrigger>
            <TabsTrigger value="rooms">
              Rooms
            </TabsTrigger>
            <TabsTrigger value="buildings">
              Buildings
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
