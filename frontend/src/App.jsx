// Root component
// Chooses between the auth screen and the signed in app
// based on the current session state
import { useEffect, useState } from "react";
import { api, isAuthed, getUser, clearAuth } from "./lib/api.js";
import { ToastProvider } from "./lib/toast.jsx";
import AuthPage from "./pages/AuthPage.jsx";
import AppShell from "./pages/AppShell.jsx";

export default function App() {
  // Initial state is read from localStorage so a page reload does not
  // briefly flash the auth screen for a signed-in user
  const [authed, setAuthed] = useState(isAuthed());
  const [user, setUser] = useState(getUser());

  // On mount, verify the session with the server, if the cookie is missing
  // or expired the API will return 401 and we clear the local state
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
        <AppShell
          user={user}
          onSignOut={() => { clearAuth(); setAuthed(false); }}
          onUserUpdate={setUser}
        />
      ) : (
        <AuthPage onAuth={(u) => { setUser(u); setAuthed(true); }} />
      )}
    </ToastProvider>
  );
}
