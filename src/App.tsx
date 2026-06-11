import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Lobby from "@/pages/Lobby";
import GamePlay from "@/pages/GamePlay";
import Editor from "@/pages/Editor";
import Achievements from "@/pages/Achievements";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Lobby />} />
        <Route path="/play/:id" element={<GamePlay />} />
        <Route path="/play/custom/:code" element={<GamePlay />} />
        <Route path="/editor" element={<Editor />} />
        <Route path="/editor/:code" element={<Editor />} />
        <Route path="/achievements" element={<Achievements />} />
      </Routes>
    </Router>
  );
}
