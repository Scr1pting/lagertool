import useFetch from "@/hooks/fetch/useFetch"
import type { ItemBorrowHistory } from "@/types/borrow"

function useFetchItemBorrowHistory(itemId: number) {
    // TODO: Switch back to real endpoint
    return useFetch<ItemBorrowHistory[]>(`/item-borrow-history.sample.json`)
}

export default useFetchItemBorrowHistory