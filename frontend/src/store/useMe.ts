import { create } from 'zustand'
import type { Me } from '@/types/me'

interface MeState {
  me: Me | null
  setMe: (me: Me | null) => void
}

// Logged-in user, set once in App from GET /me. Use e.g. `useMe(s => s.me?.isAdmin)`.
const useMe = create<MeState>(set => ({
  me: null,
  setMe: me => set({ me }),
}))

export default useMe
