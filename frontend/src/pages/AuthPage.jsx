// the login / register screen. one form, toggles between modes.
import { useState } from "react";
import { api, setAuth } from "../lib/api.js";
import { Button, Card, Field, Input } from "../components/ui.jsx";
import { House, ArrowRight, Sparkles, Wallet, ShoppingBasket, Megaphone } from "lucide-react";

export default function AuthPage({ onAuth }) {
  // "login" or "register"
  const [mode, setMode] = useState("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      // same endpoints return a token + user. just hit the right one.
      const path = mode === "login" ? "/api/auth/login" : "/api/auth/register";
      const body = mode === "login" ? { email, password } : { name, email, password };
      const data = await api.post(path, body);
      setAuth(data.access_token, data.user);
      onAuth(data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-full grid lg:grid-cols-2">
      {/* left: brand + value props */}
      <div className="hidden lg:flex flex-col justify-between p-12 bg-zinc-950 text-zinc-100 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(700px_360px_at_20%_0%,rgba(99,102,241,0.18),transparent_60%),radial-gradient(500px_280px_at_85%_100%,rgba(99,102,241,0.10),transparent_70%)] pointer-events-none" />
        <div className="relative flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-accent-grad grid place-items-center shadow-innerTop">
            <House size={16} className="text-white" />
          </div>
          <span className="text-[15px] font-semibold tracking-tight">Domify</span>
        </div>

        <div className="relative max-w-md">
          <h1 className="text-[42px] font-semibold tracking-tight leading-[1.05]">
            One place<br />
            <span className="bg-gradient-to-r from-white to-accent-200 bg-clip-text text-transparent">for your house.</span>
          </h1>
          <p className="mt-5 text-[15px] text-zinc-400 leading-relaxed">
            Chores, rent, groceries, the plumber on Tuesday. Stop tracking it
            across five group chats.
          </p>
          <ul className="mt-9 space-y-3.5 text-sm text-zinc-300">
            {[
              [Sparkles, "Chore rotation that actually rotates"],
              [Wallet, "Who owes who, in one place"],
              [ShoppingBasket, "Shared grocery list everyone can edit"],
              [Megaphone, "Announcements and quiet hours"],
            ].map(([I, t]) => (
              <li key={t} className="flex items-center gap-3">
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-zinc-900 ring-1 ring-white/5 text-accent-400">
                  <I size={15} />
                </span>
                {t}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative text-[12px] text-zinc-500">Built for the brownstone.</div>
      </div>

      {/* right: form */}
      <div className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-sm">
          {/* mobile-only brand */}
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <div className="h-8 w-8 rounded-lg bg-accent-grad grid place-items-center shadow-innerTop">
              <House size={16} className="text-white" />
            </div>
            <span className="text-[15px] font-semibold tracking-tight">Domify</span>
          </div>

          <h2 className="text-2xl font-semibold tracking-tight">
            {mode === "login" ? "Sign in" : "Create your account"}
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            {mode === "login"
              ? "Welcome back."
              : "It takes ten seconds, no credit card."}
          </p>

          <Card className="mt-6 shadow-none">
            <form onSubmit={submit} className="flex flex-col gap-3 p-5">
              {mode === "register" && (
                <Field label="Name">
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Naraen"
                    required
                  />
                </Field>
              )}
              <Field label="Email">
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@email.com"
                  required
                  autoComplete="email"
                />
              </Field>
              <Field label="Password">
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                />
              </Field>
              {error && (
                <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                  {error}
                </div>
              )}
              <Button variant="primary" disabled={busy} className="mt-1">
                {mode === "login" ? "Sign in" : "Create account"}
                <ArrowRight size={15} />
              </Button>
            </form>
          </Card>

          <p className="mt-4 text-center text-sm text-zinc-500">
            {mode === "login" ? "Don't have an account? " : "Already have an account? "}
            <button
              type="button"
              onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }}
              className="font-medium text-accent-600 hover:text-accent-700 hover:underline underline-offset-4"
            >
              {mode === "login" ? "Create one" : "Sign in"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
