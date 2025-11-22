import AddCartDialog from "@/components/AddCartDialog/AddCartDialog"
import RegularPage from "@/components/RegularPage"
import { Button } from "@/components/shadcn/button"
import { Card, CardContent } from "@/components/shadcn/card"
import { Separator } from "@/components/shadcn/separator"
import StaticShelf from "@/components/Shelves/viewer/StaticShelf"
import useFetchItem from "@/hooks/fetch/useFetchItem"
import { PencilIcon, ShoppingCartIcon } from "lucide-react"


function ItemDetail() {
  const { data: item } = useFetchItem()
  
  return (
    <RegularPage title={item?.name ?? "Loading"}>
      { item && (
        <>
          <div className="flex gap-3">
            <Button variant="outline">
              Edit
              <PencilIcon />
            </Button>

            <AddCartDialog item={item}>
              <Button>
                Add to Cart
                <ShoppingCartIcon />
              </Button>
            </AddCartDialog>
          </div>

          <div className="flex flex-col mt-5 gap-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Name</span>
              <span className="font-medium">{item.name}</span>
            </div>

            <Separator />

            <div className="flex justify-between">
              <span className="text-muted-foreground">Building</span>
              <span className="font-medium">{item.buildingName}</span>
            </div>

            <Separator />

            <div className="flex justify-between">
              <span className="text-muted-foreground">Room</span>
              <span className="font-medium">{item.roomName}</span>
            </div>

            <Separator />

            <div className="flex justify-between">
              <span className="text-muted-foreground">Amount</span>
              <span className="font-medium">{item.amount}</span>
            </div>

            <Separator />

            <div className="flex justify-between">
              <span className="text-muted-foreground">Available</span>
              <span className="font-medium">{item.available}</span>
            </div>
          </div>

          <h2 className="text-xl font-semibold pt-10 pb-5">
            Location in Shelf
          </h2>

          <Card>
            <CardContent className="flex justify-center pt-8">
              { item?.shelf &&
                <StaticShelf shelf={item.shelf} highlightedElement={item.shelfElementId} />
              }
            </CardContent>
          </Card>
      </>
    )}
    </RegularPage>
  )
}

export default ItemDetail
