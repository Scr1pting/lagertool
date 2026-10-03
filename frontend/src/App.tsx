import { useEffect } from 'react'
import { Routes, Route } from 'react-router'

import Account from './pages/Account'
import AddShelf from './pages/AddShelf'
import Home from './pages/Home'
import Search from './pages/Search'
import WithNavBar from './components/NavBar/WithNavBar'
import ShoppingCart from './pages/ShoppingCart'
import { Toaster } from './components/shadcn/sonner'
import ManageInventory from './pages/ManageInventory'
import ItemDetail from './pages/ItemDetail'
import Login from './pages/Login'
import BorrowRequests from './pages/BorrowRequests'
import useFetchMe from './hooks/fetch/useFetchMe'
import useMe from './store/useMe'

function App() {
  useEffect(() => {
    const root = document.documentElement

    root.dataset.theme = 'dark'
    root.classList.add('dark')

    return () => {
      delete root.dataset.theme
      root.classList.remove('dark')
    }
  }, [])

  const { status: meStatus, data: me } = useFetchMe()
  const setMe = useMe(s => s.setMe)
  useEffect(() => {
    setMe(meStatus === "success" ? me : null)
  }, [meStatus, me, setMe])

  // Wait for GET /me before deciding, so logged-in users don't flash the login page.
  if (meStatus === "idle" || meStatus === "loading") return null
  const isLoggedIn = meStatus === "success"

  const protectedRoutes = <>
    <Route element={<WithNavBar />}>
      <Route path="/" element={<Home />} />
      <Route path="/search" element={<Search />}/>
      <Route path="/manage-inventory" element={<ManageInventory />}/>
      <Route path="/borrow-requests" element={<BorrowRequests />}/>
      <Route path="/shopping-cart" element={<ShoppingCart />}/>
      <Route path="/item" element={<ItemDetail />}/>
      <Route path="/account" element={<Account />} />
    </Route>
    <Route path="/add-shelf" element={<AddShelf />} />
  </>

  return (
    <>
      <Routes>
        { isLoggedIn ? protectedRoutes :
          <Route element={<WithNavBar />}>
            <Route path="*" element={<Login />} />
          </Route>
        }
      </Routes>
      <Toaster position="bottom-right" />
    </>
  )
}

export default App
