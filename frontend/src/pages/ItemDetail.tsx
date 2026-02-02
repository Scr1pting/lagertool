import AddCartDialog from "@/components/AddCartDialog/AddCartDialog"
import RegularPage from "@/components/RegularPage"
import { Button } from "@/components/shadcn/button"
import { Card, CardContent } from "@/components/shadcn/card"
import { Separator } from "@/components/shadcn/separator"
import StaticShelf from "@/components/Shelves/viewer/StaticShelf"
import useFetchItem from "@/hooks/fetch/useFetchItem"
import { PencilIcon, ShoppingCartIcon } from "lucide-react"


interface itemMetaData {
  title: string
  value: string | number
}

function ItemDetail() {
  const { data: item } = useFetchItem()
  
  const metaData: itemMetaData[] = [
    {
      "title": "Name",
      "value": item?.name ?? ""
    },
    {
      "title": "Building",
      "value": item?.building.name ?? ""
    },
    {
      "title": "Room",
      "value": item?.room.name ?? ""
    },
    {
      "title": "Amount",
      "value": item?.amount ?? ""
    },
    {
      "title": "Available",
      "value": item?.available ?? ""
    }
  ]

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
            {metaData.map((item, i) =>
              <>
                {i != 0 && <Separator/>}

                <div className="flex justify-between">
                  <span className="text-muted-foreground">{item.title}</span>
                  <span className="font-medium">{item.value}</span>
                </div>
              </>
            )}
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
