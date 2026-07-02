import { useEffect, useRef, useState } from "react";
import {
  Bell, Receipt, Megaphone, Brush, ShoppingBasket, Wrench,
  Scale, Moon, ArrowDownUp,
} from "lucide-react";
import { api } from "../lib/api.js";
import { timeAgo } from "../lib/format.js";

// Icon shown next to each notification, keyed by the item's kind
const KIND_ICON = {
  expense: Receipt,
  settlement: ArrowDownUp,
  announcement: Megaphone,
  chore: Brush,
  chore_done: Brush,
  grocery: ShoppingBasket,
  maintenance: Wrench,
  conflict: Scale,
  quiet: Moon,
};

export default function NotificationsBell({ houseId, userId, onNavigate }) {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  // Per user and per house so switching houses does not leak read state
  const seenKey = `domify_notif_last_seen_${userId}_${houseId}`;

  async function load() {
    if (!houseId) return;
    try {
      const list = await api.get(`/api/houses/${houseId}/notifications`);
      setItems(list);
    } catch {
      // Keep the previous list on failure so a transient error does not
      // clear the dropdown while the user is looking at it
    }
  }

  // Fetch on mount and whenever the active house changes
  // Poll every sixty seconds so the unread indicator appears for new activity
  // without requiring a page reload
  useEffect(() => {
    load();
    const t = setInterval(load, 60_000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [houseId]);

  // Close the dropdown when the user clicks anywhere outside it
  useEffect(() => {
    function onDoc(e) {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const lastSeen = Number(localStorage.getItem(seenKey) || 0);
  const hasUnread = items.some(
    (it) => new Date(it.created_at).getTime() > lastSeen
  );

  function toggle() {
    const nextOpen = !open;
    setOpen(nextOpen);
    // Opening the dropdown counts as reading everything currently listed
    if (nextOpen && items.length > 0) {
      const newest = Math.max(
        ...items.map((it) => new Date(it.created_at).getTime())
      );
      localStorage.setItem(seenKey, String(newest));
    }
  }

  return (
    <div className="relative" ref={wrapRef}>
      <button
        onClick={toggle}
        className="relative grid h-8 w-8 place-items-center rounded-lg text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700"
        aria-label="Notifications"
      >
        <Bell size={15} />
        {hasUnread && (
          <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-accent-500 animate-pulse-dot" />
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 rounded-xl border border-zinc-200 bg-white shadow-lg z-40 overflow-hidden">
          <div className="px-4 py-2.5 border-b border-zinc-100 text-[13px] font-semibold text-zinc-800">
            Notifications
          </div>
          {items.length === 0 ? (
            <div className="px-4 py-6 text-center text-[13px] text-zinc-500">
              No activity yet.
            </div>
          ) : (
            <ul className="max-h-96 overflow-y-auto divide-y divide-zinc-100">
              {items.map((it) => {
                const Icon = KIND_ICON[it.kind] || Bell;
                return (
                  <li key={it.id}>
                    <button
                      onClick={() => { setOpen(false); onNavigate(it.view); }}
                      className="w-full text-left px-4 py-2.5 hover:bg-zinc-50 flex gap-3"
                    >
                      <div className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-zinc-100 text-zinc-600">
                        <Icon size={13} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-[13px] text-zinc-800 truncate">
                          <span className="font-medium">{it.actor_name}</span>{" "}
                          <span className="text-zinc-600">{it.message}</span>
                        </div>
                        <div className="text-[11px] text-zinc-500">
                          {timeAgo(it.created_at)}
                        </div>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
