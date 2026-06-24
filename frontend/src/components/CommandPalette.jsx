// quick "jump to" palette. opens on cmd+k or by clicking the search chip.
// type to filter, arrows to move, enter to go.
import { useEffect, useRef, useState } from "react";
import { Search, CornerDownLeft, ArrowUp, ArrowDown } from "lucide-react";
import { Kbd } from "./ui.jsx";

export default function CommandPalette({ open, onClose, items, onSelect }) {
  const [q, setQ] = useState("");
  const [idx, setIdx] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  // simple case-insensitive substring filter
  const filtered = items.filter((it) => {
    const s = q.trim().toLowerCase();
    if (!s) return true;
    return it.label.toLowerCase().includes(s) || (it.group || "").toLowerCase().includes(s);
  });

  // when we open the palette, reset state and focus the input
  useEffect(() => {
    if (!open) return;
    setQ("");
    setIdx(0);
    setTimeout(() => inputRef.current?.focus(), 10);
  }, [open]);

  // reset highlight when the query changes
  useEffect(() => { setIdx(0); }, [q]);

  // keep the highlighted row visible when arrowing past the fold
  useEffect(() => {
    const el = listRef.current?.children?.[idx];
    if (el) el.scrollIntoView({ block: "nearest" });
  }, [idx]);

  if (!open) return null;

  function onKey(e) {
    if (e.key === "Escape") { onClose(); return; }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setIdx((i) => Math.min(i + 1, filtered.length - 1));
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setIdx((i) => Math.max(i - 1, 0));
    }
    if (e.key === "Enter") {
      e.preventDefault();
      const it = filtered[idx];
      if (it) { onSelect(it); onClose(); }
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[14vh] bg-zinc-900/50 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        onKeyDown={onKey}
        className="w-full max-w-lg mx-4 rounded-2xl border border-zinc-200 bg-white shadow-pop overflow-hidden animate-pop-in"
      >
        <div className="flex items-center gap-2.5 px-4 py-3 border-b border-zinc-100">
          <Search size={15} className="text-zinc-400" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Jump to a view..."
            className="flex-1 bg-transparent outline-none text-sm placeholder:text-zinc-400 text-zinc-900"
          />
        </div>

        <ul ref={listRef} className="max-h-[48vh] overflow-y-auto py-1.5">
          {filtered.length === 0 ? (
            <li className="px-4 py-8 text-sm text-zinc-500 text-center">
              Nothing matches "{q}".
            </li>
          ) : (
            filtered.map((it, i) => {
              const Icon = it.icon;
              const active = i === idx;
              return (
                <li
                  key={it.key}
                  onMouseEnter={() => setIdx(i)}
                  onClick={() => { onSelect(it); onClose(); }}
                  className={
                    "flex items-center gap-3 px-3 mx-1.5 py-2 rounded-lg cursor-pointer text-sm " +
                    (active ? "bg-accent-50 text-accent-700" : "text-zinc-700 hover:bg-zinc-50")
                  }
                >
                  {Icon && (
                    <span className={
                      "grid h-7 w-7 place-items-center rounded-md " +
                      (active
                        ? "bg-white text-accent-600 ring-1 ring-accent-200"
                        : "bg-zinc-100 text-zinc-500")
                    }>
                      <Icon size={14} />
                    </span>
                  )}
                  <span className="flex-1 font-medium">{it.label}</span>
                  {it.group && (
                    <span className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-zinc-400">
                      {it.group}
                    </span>
                  )}
                </li>
              );
            })
          )}
        </ul>

        <div className="flex items-center gap-3 px-4 py-2 text-[11px] text-zinc-500 border-t border-zinc-100 bg-zinc-50/60">
          <span className="flex items-center gap-1.5"><Kbd><ArrowUp size={9} /></Kbd><Kbd><ArrowDown size={9} /></Kbd> navigate</span>
          <span className="flex items-center gap-1.5"><Kbd><CornerDownLeft size={9} /></Kbd> select</span>
          <span className="flex items-center gap-1.5"><Kbd>esc</Kbd> close</span>
        </div>
      </div>
    </div>
  );
}
