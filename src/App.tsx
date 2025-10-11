import { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';

import AddPage from './pages/AddPage';
import AddPersonPage from './pages/AddPersonPage';
import BorrowPage from './pages/BorrowPage';
import BorrowedPage from './pages/BorrowedPage';
import EventsPage from './pages/EventsPage';
import ItemDetailsPage from './pages/ItemDetailsPage';
import InventoryStatusPage from './pages/InventoryStatusPage';
import LocationPage from './pages/LocationPage';
import PersonHistoryPage from './pages/PersonHistoryPage';
import ShelvesPage from './pages/ShelvesPage';
import Search from './pages/Search';
import ShelfBuilder from './pages/ShelfBuilder';

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
        <Route path="/" element={<Search />} />
        <Route path="/search" element={<Search />} />
        <Route path="/shelf-builder" element={<ShelfBuilder />} />
        <Route path="/shelves" element={<ShelvesPage />} />
        <Route path="/inventory" element={<InventoryStatusPage />} />
        <Route path="/borrowed" element={<BorrowedPage />} />
        <Route path="/borrow" element={<BorrowPage />} />
        <Route path="/locations" element={<LocationPage />} />
        <Route path="/add" element={<AddPage />} />
        <Route path="/persons" element={<AddPersonPage />} />
        <Route path="/persons/:personId" element={<PersonHistoryPage />} />
        <Route path="/items/:itemId" element={<ItemDetailsPage />} />
        <Route path="/events" element={<EventsPage />} />
      </Routes>
    </main>
  );
}

export default App;
