// src/App.tsx
import { useAuth } from "./contexts/AuthContext";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Layout from "./pages/Layout";
import { useState } from "react";
import { ThemeProvider } from "./contexts/ThemeContext";
import { SocketProvider } from "./contexts/SocketContext";

const App = () => {
  const { token, user } = useAuth();
  const [authMode, setAuthMode] = useState<"login" | "register">("login");

  if (!token || !user?._id) {
    return authMode === "login" ? (
      <Login switchToRegister={() => setAuthMode("register")} />
    ) : (
      <Register switchToLogin={() => setAuthMode("login")} />
    );
  }

  return (
    <ThemeProvider>
      <SocketProvider>
        <div className="h-screen w-screen text-black overflow-hidden dark:text-white bg-white dark:bg-gray-900">
          <Layout />
        </div>
      </SocketProvider>
    </ThemeProvider>
  );
};

export default App;
