import { Routes, Route } from 'react-router-dom';

import ShelfBuilder from './pages/ShelfBuilder'


function App() {
  return (
    <NavBar/>
    <Routes>
      <Route path="/" element={<ShelfBuilder />} />
    </Routes>
  )
}

export default App
