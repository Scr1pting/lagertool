import { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';

import Account from './pages/Account';
import AddShelf from './pages/AddShelf';
import Home from './pages/Home';
import Search from './pages/Search';
import WithNavLayout from './components/WithNavBar';
import Persons from './pages/Persons';
import ShoppingCart from './pages/ShoppingCart';
import { Toaster } from './components/shadcn/sonner';
import ManageInventory from './pages/ManageInventory';
import ItemDetail from './pages/ItemDetail';

function App() {
  useEffect(() => {
    const root = document.documentElement;

    root.dataset.theme = 'dark';
    root.classList.add('dark');

    return () => {
      delete root.dataset.theme;
      root.classList.remove('dark');
    };
  }, []);

  return (
    <>
      <main>
        <Routes>
          <Route element={<WithNavLayout />}>
            <Route path="/" element={<Home />} />
            <Route path="/search" element={<Search />}/>
            <Route path="/manage-inventory" element={<ManageInventory />}/>
            <Route path="/persons" element={<Persons />}/>
            <Route path="/shopping-cart" element={<ShoppingCart />}/>
            <Route path="/item" element={<ItemDetail />}/>
            <Route path="/account" element={<Account />} />
          </Route>
          <Route path="/add-shelf" element={<AddShelf />} />
        </Routes>
      </main>
      <Toaster position="bottom-right" />
    </>
  );
}

export default App;
