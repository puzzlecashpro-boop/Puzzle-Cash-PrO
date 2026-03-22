import { BrowserRouter as Router, Routes, Route } from "react-router";
import { AuthProvider } from "@getmocha/users-service/react";
import { GameProvider } from "@/react-app/context/GameContext";
import HomePage from "@/react-app/pages/Home";
import GamePage from "@/react-app/pages/GamePage";
import AuthCallbackPage from "@/react-app/pages/AuthCallback";
import AdminDashboard from "@/react-app/pages/AdminDashboard";

export default function App() {
  return (
    <AuthProvider>
      <GameProvider>
        <Router>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/game/:gameId" element={<GamePage />} />
            <Route path="/auth/callback" element={<AuthCallbackPage />} />
            <Route path="/admin" element={<AdminDashboard />} />
          </Routes>
        </Router>
      </GameProvider>
    </AuthProvider>
  );
}
