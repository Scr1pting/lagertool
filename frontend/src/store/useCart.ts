import { create } from 'zustand'
import { type CartItem } from '@/types/cart'

interface CartState {
  cartItems: CartItem[];
  add: (newItem: CartItem) => void;
  // Sets an item's amount; 0 removes it.
  setAmount: (id: number, amount: number) => void;
  removeAll: () => void;
  update: (newItems: CartItem[]) => void;
}

export const useCart = create<CartState>(set => ({
  cartItems: [],
  // Like the backend: adding an item that's already in the cart adds to its amount.
  add: newItem =>
    set(state => state.cartItems.some(item => item.id === newItem.id)
      ? {
        cartItems: state.cartItems.map(item => item.id === newItem.id
          ? { ...item, amountSelected: item.amountSelected + newItem.amountSelected }
          : item),
      }
      : { cartItems: [...state.cartItems, newItem] }),
  setAmount: (id, amount) =>
    set(state => ({
      cartItems: amount > 0
        ? state.cartItems.map(item => item.id === id ? { ...item, amountSelected: amount } : item)
        : state.cartItems.filter(item => item.id !== id),
    })),
  removeAll: () => set({ cartItems: [] }),
  update: newItems => set({ cartItems: newItems }),
}))
