import { Routes, Route } from 'react-router-dom';

import ShelfBuilder from './pages/ShelfBuilder';
import Search from './pages/Search';
import NavBar from './components/NavBar';


function App() {
  return (
    <>
      <NavBar />
      <main className="pt-28">
        <Routes>
          <Route path="/" element={<Search />} />
          <Route path="/shelf-builder" element={<ShelfBuilder />} />
        </Routes>
      </main>
    </>
  )
}

export default App
