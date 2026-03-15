import { Routes, Route } from 'react-router-dom';
import LibraryPage from './pages/LibraryPage';
import DetailPage from './pages/DetailPage';

function App() {
  return (
    <Routes>
      <Route path="/" element={<LibraryPage />} />
      <Route path="/vol/:vid" element={<DetailPage />} />
    </Routes>
  );
}

export default App;
