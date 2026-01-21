// src/App.jsx

import "./App.css";
import AppRoutes from "./routes/AppRoutes";
import useOnlineStatus from "./hooks/useOnlineStatus";
import NetworkError from "./pages/errors/NetworkError";

export default function App() {
  const isOnline = useOnlineStatus();

  if (!isOnline) {
    return <NetworkError />;
  }

  return <AppRoutes />;
}
