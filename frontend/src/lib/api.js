// small wrapper around fetch.
// keeps the jwt + user info in localStorage so the page survives refresh.

const TOKEN_KEY = "domify_token";
const USER_KEY = "domify_user";

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function getUser() {
  const raw = localStorage.getItem(USER_KEY);
  return raw ? JSON.parse(raw) : null;
}

export function setAuth(token, user) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem("domify_active_house");
}

// in dev/local both services run together so this stays empty.
// in prod, set VITE_API_BASE on vercel to the backend's full url.
const BASE = import.meta.env.VITE_API_BASE || "";

// one helper for every request. handles the auth header and json parsing.
async function req(method, path, body) {
  const headers = { "Content-Type": "application/json" };
  const tok = getToken();
  if (tok) headers.Authorization = `Bearer ${tok}`;
  const res = await fetch(BASE + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 401) {
    // token went bad. wipe it and send the user back to login.
    clearAuth();
    if (location.pathname !== "/") location.href = "/";
    throw new Error("Not authenticated");
  }
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    // fastapi puts the message in `detail`
    const msg = (data && (data.detail || data.message)) || res.statusText;
    throw new Error(typeof msg === "string" ? msg : "Request failed");
  }
  return data;
}

export const api = {
  get: (p) => req("GET", p),
  post: (p, b) => req("POST", p, b),
  put: (p, b) => req("PUT", p, b),
  patch: (p, b) => req("PATCH", p, b),
  del: (p) => req("DELETE", p),
};
