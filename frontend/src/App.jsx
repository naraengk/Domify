// top-level component. picks between the auth screen and the main app.
import { useEffect, useState } from "react";
import { api, getToken, getUser, clearAuth } from "./lib/api.js";
import { ToastProvider } from "./lib/toast.jsx";
import AuthPage from "./pages/AuthPage.jsx";
import AppShell from "./pages/AppShell.jsx";

export default function App() {
  // tiny "router". just two top-level views, no react-router needed
  const [authed, setAuthed] = useState(!!getToken());
  const [user, setUser] = useState(getUser());

  // on first load, if we have a token, check it's still valid.
  // if the server rejects it, clear it and show the auth screen.
  useEffect(() => {
    if (!authed) return;
    api.get("/api/auth/me").then(setUser).catch(() => {
      clearAuth();
      setAuthed(false);
    });
  }, []);

  return (
    <ToastProvider>
      {authed ? (
        <AppShell user={user} onSignOut={() => { clearAuth(); setAuthed(false); }} />
      ) : (
        <AuthPage onAuth={(u) => { setUser(u); setAuthed(true); }} />
      )}
    </ToastProvider>
  );
}
