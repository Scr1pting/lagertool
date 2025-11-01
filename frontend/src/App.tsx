import { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';

import AddShelf from './pages/AddShelf';
import Home from './pages/Home';
import Search from './pages/Search';
import WithNavLayout from './components/WithNavBar';
import AddInventory from './pages/AddInventory';
import Persons from './pages/Persons';
import ShoppingCart from './pages/ShoppingCart';
import { Toaster } from './components/shadcn/sonner';

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
            <Route path="/add" element={<AddInventory />}/>
            <Route path="/persons" element={<Persons />}/>
            <Route path="/shopping-cart" element={<ShoppingCart />}/>
          </Route>
          <Route path="/shelf-builder" element={<AddShelf />} />
        </Routes>
      </main>
      <Toaster position="bottom-right" />
    </>
  );
}

export default App;
