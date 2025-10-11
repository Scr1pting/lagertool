import { Routes, Route } from 'react-router-dom';

import ShelfBuilder from './pages/ShelfBuilder';
import Search from './pages/Search';
import NavBar from './components/NavBar';
import BorrowedPage from './pages/BorrowedPage';
import BorrowPage from './pages/BorrowPage';
import AddPage from './pages/AddPage';
import LocationPage from './pages/LocationPage';
import AddPersonPage from './pages/AddPersonPage';


function App() {
  return (
    <>
      <NavBar />
      <main className="pt-28">
        <Routes>
          <Route path="/search" element={<Search />} />
          <Route path="/shelf-builder" element={<ShelfBuilder />} />
          <Route path="/borrowed" element={<BorrowedPage />} />
          <Route path="/borrow" element={<BorrowPage />} />
          <Route path="/locations" element={<LocationPage />} />
          <Route path="/add" element={<AddPage />} />
          <Route path="/persons" element={<AddPersonPage />} />
        </Routes>

      </main>
    </>
  )
}

export default App
