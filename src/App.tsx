import { Routes, Route } from 'react-router-dom';

import ShelfBuilder from './pages/ShelfBuilder';
import Search from './pages/Search';
import NavBar from './components/SearchBar';


function App() {
  return (
    <div>
      <NavBar/>
      <Routes>
        <Route path="/" element={<Search />} />
        <Route path="/shelf-builder" element={<ShelfBuilder />} />
      </Routes>
    </div>
  )
}

export default App
