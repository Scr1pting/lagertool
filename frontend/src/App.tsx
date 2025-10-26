import { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';

import AddShelf from './pages/AddShelf';
import Home from './pages/Home';
import Search from './pages/Search';
import Borrow from './pages/Borrow';

import WithNavLayout from './components/WithNavBar';
import AddInventory from './pages/AddInventory';
import Persons from './pages/Persons';

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
    <main>
      <Routes>
        <Route element={<WithNavLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/search" element={<Search />}/>
          <Route path="/borrow" element={<Borrow />}/>
          <Route path="/add" element={<AddInventory />}/>
          <Route path="/persons" element={<Persons />}/>
        </Route>
        <Route path="/shelf-builder" element={<AddShelf />} />
      </Routes>
    </main>
  );
}

export default App;
