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
import AddItem from "@/components/ManageInventory/forms/AddItemForm"
import AddBuilding from "@/components/ManageInventory/forms/AddBuildingForm"
import AddRoom from "@/components/ManageInventory/forms/AddRoomForm"
import AddShelf from "@/components/ManageInventory/forms/AddShelfForm"


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
