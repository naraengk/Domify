// Bottom tab bar shown on phones, Only the four most-used pages live here
// The remaining pages stay in the sidebar, which is hidden on mobile widths
import { Home, Receipt, Brush, User } from "lucide-react";

// Tabs to display, in left-to-right order, Edit this list to add or remove
// tabs without touching the markup below
const TABS = [
  { key: "dashboard", label: "Home", icon: Home },
  { key: "expenses", label: "Expenses", icon: Receipt },
  { key: "chores", label: "Chores", icon: Brush },
  { key: "profile", label: "Profile", icon: User },
];

// Hidden on lg and wider, where the sidebar serves as the primary nav
// The safe-area padding keeps the bar above the home indicator
// when the browser is rendered full-screen
export default function BottomNav({ view, setView }) {
  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 border-t border-zinc-200/80 bg-white/90 backdrop-blur-md safe-bottom">
      <div className="flex items-stretch justify-around px-1 pb-[env(safe-area-inset-bottom)]">
        {TABS.map((t) => {
          // Each tab is a button, The active one has a thicker stroke and
          // accent color so the current page is obvious at a glance
          const Icon = t.icon;
          const active = view === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setView(t.key)}
              className={
                "flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium transition-colors active:scale-95 " +
                (active ? "text-accent-600" : "text-zinc-500")
              }
            >
              <Icon size={20} strokeWidth={active ? 2.25 : 1.75} />
              {t.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
