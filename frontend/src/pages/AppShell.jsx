// The main application shell, Renders the topbar, the sidebar (or the
// bottom bar on mobile), and the currently selected page, Also owns the
// "which house am I in" state and passes that down to each child page
import { useEffect, useState } from "react";
import {
  House, LayoutGrid, Brush, Receipt, BarChart3, ShoppingBasket,
  Megaphone, Moon, Wrench, Scale, Users, UserCircle, LogOut, Plus, KeyRound,
  Copy, Menu, X, Search, ChevronDown, ChevronRight,
} from "lucide-react";
import { logout, api } from "../lib/api.js";
import { useToast } from "../lib/toast.jsx";
import { Button, Modal, Field, Input, EmptyState, Kbd } from "../components/ui.jsx";
import { LogoMono } from "../components/Logo.jsx";
import CommandPalette from "../components/CommandPalette.jsx";
import NotificationsBell from "../components/NotificationsBell.jsx";

import Dashboard from "./Dashboard.jsx";
import Chores from "./Chores.jsx";
import Expenses from "./Expenses.jsx";
import Insights from "./Insights.jsx";
import Grocery from "./Grocery.jsx";
import Announcements from "./Announcements.jsx";
import Quiet from "./Quiet.jsx";
import Maintenance from "./Maintenance.jsx";
import Conflicts from "./Conflicts.jsx";
import HouseMembers from "./House.jsx";
import Profile from "./Profile.jsx";
import BottomNav from "../components/BottomNav.jsx";

// Sidebar navigation, grouped into three sections, To add or remove pages,
// edit this list and the corresponding render block below.
const NAV_GROUPS = [
  {
    label: "Workspace",
    items: [
      { key: "dashboard", label: "Dashboard", icon: LayoutGrid },
      { key: "insights",  label: "Insights",  icon: BarChart3 },
    ],
  },
  {
    label: "House",
    items: [
      { key: "chores",        label: "Chores",        icon: Brush },
      { key: "expenses",      label: "Expenses",      icon: Receipt },
      { key: "grocery",       label: "Grocery",       icon: ShoppingBasket },
      { key: "announcements", label: "Announcements", icon: Megaphone },
    ],
  },
  {
    label: "Management",
    items: [
      { key: "quiet",       label: "Quiet hours",  icon: Moon },
      { key: "maintenance", label: "Maintenance",  icon: Wrench },
      { key: "conflicts",   label: "Conflict log", icon: Scale },
      { key: "house",       label: "Roommates",    icon: Users },
      { key: "profile",     label: "Profile",      icon: UserCircle },
    ],
  },
];

const TITLES = {
  dashboard: "Dashboard", chores: "Chores", expenses: "Expenses",
  insights: "Insights", grocery: "Grocery", announcements: "Announcements",
  quiet: "Quiet hours", maintenance: "Maintenance",
  conflicts: "Conflict log", house: "Roommates", profile: "Profile",
};

export default function AppShell({ user, onSignOut, onUserUpdate }) {
  const { push } = useToast();
  const [houses, setHouses] = useState([]);
  const [activeHouse, setActiveHouse] = useState(null);
  const [members, setMembers] = useState([]);
  const [view, setView] = useState("dashboard");
  const [mobileNav, setMobileNav] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

  // Global keyboard shortcuts
  // Cmd+K (or Ctrl+K) toggles the command
  // palette. Single-letter shortcuts are reserved for future quick actions
  // and are ignored when the user is typing in a form field
  useEffect(() => {
    function handler(e) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((p) => !p);
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const tag = e.target?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select") return;
      if (e.key.toLowerCase() === "n" && view === "expenses") {
        /* reserved for opening the new-expense modal from the keyboard */
      }
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [view]);

  // Flatten the nav groups into a single list for the command palette
  const paletteItems = NAV_GROUPS.flatMap((g) =>
    g.items.map((it) => ({ key: it.key, label: it.label, icon: it.icon, group: g.label }))
  );

  // Load the list of houses the user belongs to. The active house is the
  // one they had selected last session, or the first house in the list if
  // there is no saved selection
  async function loadHouses(preferId = null) {
    const list = await api.get("/api/houses/mine");
    setHouses(list);
    if (list.length === 0) { setActiveHouse(null); return; }
    const saved = preferId || Number(localStorage.getItem("domify_active_house")) || list[0].id;
    const next = list.find((h) => h.id === saved) || list[0];
    setActiveHouse(next);
    localStorage.setItem("domify_active_house", String(next.id));
  }

  async function loadMembers(houseId) {
    setMembers(await api.get(`/api/houses/${houseId}/members`));
  }

  useEffect(() => { loadHouses(); }, []);
  useEffect(() => { if (activeHouse) loadMembers(activeHouse.id); }, [activeHouse?.id]);

  const ctx = { house: activeHouse, members, refreshMembers: () => loadMembers(activeHouse.id) };

  return (
    <div className="min-h-full flex flex-col app-bg">
      {/* topbar */}
      <header className="sticky top-0 z-30 border-b border-zinc-200/60 bg-white/75 backdrop-blur-md">
        <div className="flex h-14 items-center gap-3 px-4 sm:px-6">
          <button
            onClick={() => setMobileNav(true)}
            className="lg:hidden rounded-md p-1.5 text-zinc-600 hover:bg-zinc-100"
            aria-label="Open menu"
          >
            <Menu size={18} />
          </button>

          <div className="flex items-center gap-2">
            <div className="grid h-7 w-7 place-items-center rounded-lg bg-accent-grad shadow-innerTop">
              <LogoMono size={16} className="text-white" />
            </div>
            <span className="text-[14px] font-semibold tracking-tight">Domify</span>
          </div>

          {/* breadcrumb */}
          {activeHouse && (
            <div className="ml-1 hidden md:flex items-center gap-1.5 text-[13px] text-zinc-500">
              <ChevronRight size={13} className="text-zinc-300" />
              <span className="text-zinc-700 font-medium">{activeHouse.name}</span>
              <ChevronRight size={13} className="text-zinc-300" />
              <span>{TITLES[view] || view}</span>
            </div>
          )}

          {/* search chip. clicking it (or cmd+k) opens the command palette */}
          <div className="ml-auto hidden md:flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPaletteOpen(true)}
              className="flex items-center gap-2 h-8 rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 text-[13px] text-zinc-500 hover:bg-zinc-100 hover:border-zinc-300 transition-colors"
            >
              <Search size={13} />
              <span>Search</span>
              <Kbd>⌘K</Kbd>
            </button>
          </div>

          {/* right cluster */}
          <div className="ml-auto md:ml-0 flex items-center gap-1.5">
            {activeHouse && (
              <HousePicker
                houses={houses}
                active={activeHouse}
                onChange={(id) => loadHouses(id)}
              />
            )}
            <Button size="sm" variant="ghost" onClick={() => setCreateOpen(true)} className="hidden sm:inline-flex">
              <Plus size={14} /> New
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setJoinOpen(true)} className="hidden sm:inline-flex">
              <KeyRound size={14} /> Join
            </Button>

            {activeHouse && (
              <NotificationsBell
                houseId={activeHouse.id}
                userId={user.id}
                onNavigate={setView}
              />
            )}

            <div className="hidden sm:flex items-center gap-2 pl-2 ml-1 border-l border-zinc-200">
              <div className="relative grid h-7 w-7 place-items-center rounded-full bg-gradient-to-br from-accent-500 to-accent-700 text-[11px] font-semibold text-white shadow-innerTop">
                {user?.name?.[0]?.toUpperCase()}
              </div>
              <span className="text-[13px] text-zinc-700 font-medium max-w-[120px] truncate">{user?.name}</span>
            </div>
            <Button size="sm" variant="ghost" onClick={async () => { await logout(); onSignOut(); }} aria-label="Sign out">
              <LogOut size={14} />
            </Button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 min-h-0">
        {/* sidebar (desktop) */}
        <aside className="hidden lg:flex w-64 shrink-0 flex-col border-r border-zinc-200/70 bg-white/50">
          <Nav view={view} setView={setView} memberCount={members.length} />
          <InviteFooter house={activeHouse} />
        </aside>

        {/* mobile slide-over */}
        {mobileNav && (
          <div className="lg:hidden fixed inset-0 z-40 bg-zinc-900/50 backdrop-blur-sm animate-fade-in" onClick={() => setMobileNav(false)}>
            <aside
              onClick={(e) => e.stopPropagation()}
              className="absolute inset-y-0 left-0 w-72 bg-white border-r border-zinc-200 flex flex-col animate-pop-in"
            >
              <div className="flex items-center justify-between border-b border-zinc-200 px-4 h-14">
                <span className="text-[14px] font-semibold">Menu</span>
                <button onClick={() => setMobileNav(false)} className="p-1.5 rounded-md hover:bg-zinc-100">
                  <X size={16} />
                </button>
              </div>
              <Nav view={view} setView={(v) => { setView(v); setMobileNav(false); }} memberCount={members.length} />
              <InviteFooter house={activeHouse} />
            </aside>
          </div>
        )}

        <main className="flex-1 min-w-0 overflow-y-auto pb-16 lg:pb-0">
          <div className="mx-auto max-w-6xl px-4 py-7 sm:px-8 sm:py-10">
            {!activeHouse ? (
              <OnboardingPanel onCreate={() => setCreateOpen(true)} onJoin={() => setJoinOpen(true)} />
            ) : (
              <>
                {view === "dashboard" && <Dashboard ctx={ctx} user={user} onGo={setView} />}
                {view === "chores" && <Chores ctx={ctx} />}
                {view === "expenses" && <Expenses ctx={ctx} user={user} />}
                {view === "insights" && <Insights ctx={ctx} />}
                {view === "grocery" && <Grocery ctx={ctx} members={members} />}
                {view === "announcements" && <Announcements ctx={ctx} />}
                {view === "quiet" && <Quiet ctx={ctx} />}
                {view === "maintenance" && <Maintenance ctx={ctx} />}
                {view === "conflicts" && <Conflicts ctx={ctx} />}
                {view === "house" && <HouseMembers ctx={ctx} user={user} onLeave={() => loadHouses()} />}
                {view === "profile" && <Profile user={user} onUserUpdate={onUserUpdate} />}
              </>
            )}
          </div>
        </main>
      </div>

      {activeHouse && <BottomNav view={view} setView={setView} />}

      <CreateHouseModal open={createOpen} onClose={() => setCreateOpen(false)} onCreated={(h) => loadHouses(h.id)} />
      <JoinHouseModal open={joinOpen} onClose={() => setJoinOpen(false)} onJoined={(h) => loadHouses(h.id)} />
      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        items={paletteItems}
        onSelect={(it) => setView(it.key)}
      />
    </div>
  );
}

function Nav({ view, setView, memberCount }) {
  return (
    <nav className="flex-1 overflow-y-auto py-3 px-3">
      {NAV_GROUPS.map((group, gi) => (
        <div key={group.label} className={gi > 0 ? "mt-5" : ""}>
          <div className="px-2 mb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-zinc-400">
            {group.label}
          </div>
          <div className="flex flex-col gap-0.5">
            {group.items.map((n) => {
              const Icon = n.icon;
              const active = view === n.key;
              return (
                <button
                  key={n.key}
                  onClick={() => setView(n.key)}
                  className={
                    "group relative flex w-full items-center gap-2.5 rounded-lg pl-2.5 pr-2 py-1.5 text-[13px] font-medium transition-colors " +
                    (active
                      ? "bg-accent-50 text-accent-700"
                      : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900")
                  }
                >
                  {active && (
                    <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r bg-accent-600" />
                  )}
                  <span className={
                    "grid h-6 w-6 place-items-center rounded-md transition-colors " +
                    (active
                      ? "bg-white text-accent-700 ring-1 ring-accent-200"
                      : "bg-zinc-100 text-zinc-500 group-hover:bg-white group-hover:text-zinc-700 group-hover:ring-1 group-hover:ring-zinc-200")
                  }>
                    <Icon size={13} />
                  </span>
                  <span className="flex-1 truncate text-left">{n.label}</span>
                  {n.key === "house" && memberCount > 0 && (
                    <span className="rounded-md bg-zinc-100 px-1.5 py-0.5 text-[10.5px] font-semibold text-zinc-500 group-hover:bg-white">
                      {memberCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}

function InviteFooter({ house }) {
  const { push } = useToast();
  if (!house) return null;
  return (
    <div className="p-3">
      <button
        onClick={() => {
          navigator.clipboard.writeText(house.invite_code);
          push("Invite code copied", "success");
        }}
        className="group flex w-full items-center justify-between gap-2 rounded-xl border border-zinc-200 bg-gradient-to-br from-white to-zinc-50 px-3 py-2.5 text-left transition-all hover:border-accent-200 hover:shadow-card"
      >
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-[0.1em] text-zinc-400 font-semibold">Invite code</div>
          <div className="font-mono text-[13.5px] font-semibold text-zinc-800 truncate">{house.invite_code}</div>
        </div>
        <span className="grid h-7 w-7 place-items-center rounded-md bg-white text-zinc-400 ring-1 ring-zinc-200 group-hover:text-accent-600 group-hover:ring-accent-200">
          <Copy size={13} />
        </span>
      </button>
    </div>
  );
}

function HousePicker({ houses, active, onChange }) {
  return (
    <div className="relative">
      <select
        value={active.id}
        onChange={(e) => onChange(Number(e.target.value))}
        className="appearance-none h-8 rounded-lg border border-zinc-200 bg-white pl-2.5 pr-7 text-[13px] font-medium text-zinc-800 hover:bg-zinc-50 hover:border-zinc-300 transition-colors"
      >
        {houses.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
      </select>
      <ChevronDown size={12} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400" />
    </div>
  );
}

function OnboardingPanel({ onCreate, onJoin }) {
  return (
    <div className="mt-8">
      <div className="rounded-2xl border border-zinc-200/80 bg-feature-tint shadow-feature p-8 sm:p-12">
        <EmptyState
          icon={House}
          title="Set up your house"
          hint="Create a new house, or join an existing one with an invite code from your roommate. Everything else (chores, rent, groceries) flows from here."
          action={
            <div className="flex gap-2">
              <Button variant="primary" onClick={onCreate}>
                <Plus size={14} /> Create a house
              </Button>
              <Button onClick={onJoin}>
                <KeyRound size={14} /> Join with code
              </Button>
            </div>
          }
        />
      </div>
    </div>
  );
}

function CreateHouseModal({ open, onClose, onCreated }) {
  const { push } = useToast();
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  return (
    <Modal open={open} title="Create a house" onClose={onClose}>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          try {
            const h = await api.post("/api/houses", { name, address });
            push("House created", "success");
            onCreated(h);
            setName(""); setAddress("");
            onClose();
          } catch (err) { push(err.message, "error"); }
        }}
        className="flex flex-col gap-3"
      >
        <Field label="House name">
          <Input value={name} onChange={(e) => setName(e.target.value)} required placeholder="The Brownstone" />
        </Field>
        <Field label="Address (optional)">
          <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="123 Main St" />
        </Field>
        <Button variant="primary" className="mt-2">Create house</Button>
      </form>
    </Modal>
  );
}

function JoinHouseModal({ open, onClose, onJoined }) {
  const { push } = useToast();
  const [code, setCode] = useState("");
  return (
    <Modal open={open} title="Join a house" onClose={onClose}>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          try {
            const h = await api.post("/api/houses/join", { invite_code: code });
            push("Joined " + h.name, "success");
            onJoined(h);
            setCode("");
            onClose();
          } catch (err) { push(err.message, "error"); }
        }}
        className="flex flex-col gap-3"
      >
        <Field label="Invite code">
          <Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} required placeholder="ABCDEF12" className="font-mono tracking-widest" />
        </Field>
        <Button variant="primary" className="mt-2">Join</Button>
      </form>
    </Modal>
  );
}
