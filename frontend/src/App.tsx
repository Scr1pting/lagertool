import { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';

import AddShelf from './pages/AddShelf';
import Home from './pages/Home';
import Search from './pages/Search';

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
          <Route path="/search" element={<Search />}/>
        </Route>
        <Route path="/shelf-builder" element={<AddShelf />} />
      </Routes>
    </main>
  );
}

export default App;
