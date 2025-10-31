import { create } from 'zustand'
import { type CartItem } from '@/types/cart'

interface CartState {
  cartItems: CartItem[];
  add: (newItem: CartItem) => void;
  removeAll: () => void;
  update: (newItems: CartItem[]) => void;
}

export const useCart = create<CartState>((set) => ({
  cartItems: [],
  add: (newItem) =>
    set((state) => ({
      cartItems: [...state.cartItems, newItem],
    })),
  removeAll: () => set({ cartItems: [] }),
  update: (newItems) => set({ cartItems: newItems }),
}));
