import { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';

import AddPage from './pages/AddPage';
import AddPersonPage from './pages/AddPersonPage';
import BorrowPage from './pages/BorrowPage';
import Search from './pages/Search';
import AddShelf from './pages/AddShelf';
import ShelvesPage from './pages/ShelvesPage';
import Home from './pages/Home';
import WithNavLayout from './components/WithNavBar';

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
          <Route path="/search" element={<Search />} />
          <Route path="/borrow" element={<BorrowPage />} />
          <Route path="/add" element={<AddPage />} />
          <Route path="/persons" element={<AddPersonPage />} />
          <Route path="/shelves" element={<ShelvesPage />} />
        </Route>
        <Route path="/shelf-builder" element={<AddShelf />} />
      </Routes>
    </main>
  );
}

export default App;
