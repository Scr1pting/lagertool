import { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';

import AddPage from './pages/AddPage';
import AddPersonPage from './pages/AddPersonPage';
import BorrowPage from './pages/BorrowPage';
import BorrowedPage from './pages/BorrowedPage';
import EventsPage from './pages/EventsPage';
import ItemDetailsPage from './pages/ItemDetailsPage';
import LocationPage from './pages/LocationPage';
import PersonHistoryPage from './pages/PersonHistoryPage';
import InventoryStatusPage from './pages/InventoryStatusPage';
import Search from './pages/Search';
import ShelfBuilder from './pages/ShelfBuilder';
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
          <Route path="/borrowed" element={<BorrowedPage />} />
          <Route path="/borrow" element={<BorrowPage />} />
          <Route path="/locations" element={<LocationPage />} />
          <Route path="/add" element={<AddPage />} />
          <Route path="/persons" element={<AddPersonPage />} />
          <Route path="/persons/:personId" element={<PersonHistoryPage />} />
          <Route path="/items/:itemId" element={<ItemDetailsPage />} />
          <Route path="/inventory" element={<InventoryStatusPage />} />
          <Route path="/shelves" element={<ShelvesPage />} />
          <Route path="/events" element={<EventsPage />} />
        </Route>
        <Route path="/shelf-builder" element={<ShelfBuilder />} />
      </Routes>
    </main>
  );
}

export default App;
