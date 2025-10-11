import { Routes, Route } from 'react-router-dom';

import ShelfBuilder from './pages/ShelfBuilder';
import Search from './pages/Search';
import NavBar from './components/NavBar';
import BorrowedPage from './pages/BorrowedPage';


function App() {
  return (
    <>
      <NavBar />
      <main className="pt-28">
        <Routes>
          <Route path="/" element={<Search />} />
          <Route path="/shelf-builder" element={<ShelfBuilder />} />
          <Route path="/borrowed" element={<BorrowedPage />} />
        </Routes>
      </main>
    </>
  )
}

export default App
