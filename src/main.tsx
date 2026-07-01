import { createRoot } from "react-dom/client";
import App from "./app/App.tsx";
import { AuthProvider } from "./app/auth/AuthProvider.tsx";
import "./styles/index.css";
import { applyTheme, preferredTheme } from "./app/lib/theme.ts";

applyTheme(preferredTheme());

createRoot(document.getElementById("root")!).render(
  <AuthProvider>
    <App />
  </AuthProvider>,
);
