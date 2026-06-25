// api wrapper. auth lives in an httpOnly cookie (no token in localStorage).

const USER_KEY = "domify_user";
const AUTH_FLAG = "domify_authed";

export function isAuthed() {
  return localStorage.getItem(AUTH_FLAG) === "1";
}

export function getUser() {
  const raw = localStorage.getItem(USER_KEY);
  return raw ? JSON.parse(raw) : null;
}

export function setAuth(user) {
  localStorage.setItem(AUTH_FLAG, "1");
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearAuth() {
  localStorage.removeItem(AUTH_FLAG);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem("domify_active_house");
}

// legacy. kept around so existing sessions can migrate cleanly
export function getToken() {
  return null;
}

const BASE = import.meta.env.VITE_API_BASE || "";

async function req(method, path, body, options = {}) {
  const headers = { ...(options.headers || {}) };
  if (!(body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }
  const res = await fetch(BASE + path, {
    method,
    headers,
    credentials: "include",
    body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 401) {
    clearAuth();
    if (location.pathname !== "/") location.href = "/";
    throw new Error("Not authenticated");
  }
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
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
  upload: (p, formData) => req("POST", p, formData),
};

export async function logout() {
  try {
    await api.post("/api/auth/logout");
  } catch {
    /* ignore */
  }
  clearAuth();
}
