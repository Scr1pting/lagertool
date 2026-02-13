import { useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'

import Account from './pages/Account'
import AddShelf from './pages/AddShelf'
import Home from './pages/Home'
import Search from './pages/Search'
import WithNavBar from './components/NavBar/WithNavBar'
import Persons from './pages/Persons'
import ShoppingCart from './pages/ShoppingCart'
import { Toaster } from './components/shadcn/sonner'
import ManageInventory from './pages/ManageInventory'
import ItemDetail from './pages/ItemDetail'
import Login from './pages/Login'
import BorrowRequests from './pages/BorrowRequests'

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

  const isLoggedIn = import.meta.env.VITE_IS_LOGGED_IN === "true"

  const protectedRoutes = <>
    <Route element={<WithNavBar />}>
      <Route path="/" element={<Home />} />
      <Route path="/search" element={<Search />}/>
      <Route path="/manage-inventory" element={<ManageInventory />}/>
      <Route path="/persons" element={<Persons />}/>
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
