import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { HomePage } from "./pages/HomePage";
import { GamePage } from "./pages/GamePage";

export default function App() {
  return (
    <BrowserRouter basename="/scrabble">
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/p/:code" element={<GamePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
