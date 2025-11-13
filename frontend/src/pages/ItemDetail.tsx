import RegularPage from "@/components/RegularPage"
import StaticShelf from "@/features/shelves/components/StaticShelf"
import useFetchItem from "@/hooks/useFetchItem"


function ItemDetail() {
  const { data: item } = useFetchItem()
  
  return (
    <RegularPage title={item?.name ?? "Loading"}>
      

      { item?.shelf &&
        <StaticShelf shelf={item.shelf} highlightedElement={item.shelfElementId} />
      }
    </RegularPage>
  )
}

export default ItemDetail
