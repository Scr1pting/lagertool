import useFetch from "./useFetch"
import { type CartItem } from "@/types/cart"
import { useDateParams } from "@/hooks/useDateParams"

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''

function useFetchCart() {
    const { startDate, endDate } = useDateParams()
    const userId = 1

    const url = `${API_BASE_URL}/users/${userId}/cart?start=${startDate}&end=${endDate}`

    const parser = (res: unknown): CartItem[] => {
        const data = res as Record<string, CartItem[]>
        return Object.values(data).flat()
    }

    return useFetch<CartItem[]>(url, parser)
}

export default useFetchCart
