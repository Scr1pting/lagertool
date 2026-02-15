import AddCartDialog from "@/components/AddCartDialog/AddCartDialog"
import RegularPage from "@/components/RegularPage"
import { Button } from "@/components/shadcn/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/shadcn/card"
import StaticShelf from "@/components/Shelves/viewer/StaticShelf"
import useFetchItem from "@/hooks/fetch/useFetchItem"
import { PencilIcon, ShoppingCartIcon } from "lucide-react"
import { useSearchParams } from "react-router-dom"


function ItemDetail() {
  const [searchParams] = useSearchParams()
  const id = parseInt(searchParams.get("id") ?? "-1")

  const { data: item = null } = useFetchItem(id)

  return (
    <RegularPage title={item?.name ?? "Loading"}>
      {item && (
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

          <div className="grid grid-cols-2 gap-5 mt-5">
            <Card className="gap-3">
              <CardHeader>
                <CardTitle>Location</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="flex justify-between">
                  <span className="font-medium">Building</span>
                  <span>{item?.building.name ?? ""}</span>
                </p>
                <p className="flex justify-between">
                  <span className="font-medium">Room</span>
                  <span>{item?.room.name ?? ""}</span>
                </p>
              </CardContent>
            </Card>

            <Card className="gap-3">
              <CardHeader>
                <CardTitle>Items</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="flex justify-between">
                  <span className="font-medium">Amount</span>
                  <span>{item?.amount ?? ""}</span>
                </p>
                <p className="flex justify-between">
                  <span className="font-medium">Available</span>
                  <span>{item?.available ?? ""}</span>
                </p>
              </CardContent>
            </Card>
          </div>

          <h2 className="text-xl font-semibold pt-10 pb-5">
            Position in Shelf
          </h2>

          <Card>
            <CardContent className="flex justify-center pt-8">
              {item?.shelf &&
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
