import { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';

import ShelfBuilder from './pages/ShelfBuilder';
import Search from './pages/Search';
import BorrowedPage from './pages/BorrowedPage';
import BorrowPage from './pages/BorrowPage';
import NavBar from './components/NavBar';


function App() {
  // Ensures darkmode
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
        <Route path="/" element={<NavBar/>} />
        <Route path="/shelf-builder" element={<ShelfBuilder/> } />
        <Route path="/search" element={<Search />} />
        <Route path="/borrowed" element={<BorrowedPage />} />
        <Route path="/borrow" element={<BorrowPage />} />
      </Routes>
    </main>
  )
}

export default App
