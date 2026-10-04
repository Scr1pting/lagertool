import RegularPage from "@/components/RegularPage"
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/shadcn/tabs"
import useBuilding from "@/hooks/fetch/useFetchBuildings"
import useFetchRooms from "@/hooks/fetch/useFetchRooms"
import useInventory from "@/hooks/fetch/useFetchInventory"
import useFetchShelves from "@/hooks/fetch/useFetchShelves"
import { useSearchParams } from "react-router"
import ItemTab from "@/components/ManageInventory/tabs/ItemTab"
import ShelfTab from "@/components/ManageInventory/tabs/ShelfTab"
import RoomTab from "@/components/ManageInventory/tabs/RoomTab"
import BuildingTab from "@/components/ManageInventory/tabs/BuildingTab"


const TABS = ["items", "shelves", "rooms", "buildings"]

function ManageInventory() {
  const { data: buildings } = useBuilding()
  const { data: rooms } = useFetchRooms()
  const { data: shelves } = useFetchShelves()
  const { data: inventory, refetch: refetchInventory } = useInventory()
  // ?tab=shelves etc. opens that tab, e.g. after adding a shelf.
  const [searchParams] = useSearchParams()
  const linkedTab = searchParams.get("tab")
  const initialTab = linkedTab && TABS.includes(linkedTab) ? linkedTab : "items"

  return (
    <RegularPage title="Manage Inventory">
      <div className="w-full max-w-3xl">
        <Tabs defaultValue={initialTab} className="space-y-2">
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
            refetch={refetchInventory}
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
