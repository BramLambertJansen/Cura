import { createRoot } from "react-dom/client";
import App from "./app/App.tsx";
import { AuthProvider } from "./app/auth/AuthProvider.tsx";
import { applyStoredDarkMode } from "./app/lib/useDarkMode.ts";
import "./styles/index.css";

applyStoredDarkMode();

createRoot(document.getElementById("root")!).render(
  <AuthProvider>
    <App />
  </AuthProvider>,
);
