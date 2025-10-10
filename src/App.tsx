import { Routes, Route } from 'react-router-dom';

import ShelfBuilder from './pages/ShelfBuilder';
import Search from './pages/Search';


function App() {
  return (
    <Routes>
      <Route path="/" element={<Search />} />
      <Route path="/shelf-builder" element={<ShelfBuilder />} />
    </Routes>
  )
}

export default App
