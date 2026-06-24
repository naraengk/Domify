import { useEffect } from "react";
import { X } from "lucide-react";

// the reusable bits used everywhere: buttons, cards, modal, etc.
// nothing fancy, just keeps the styles in one place.

// tiny helper so i can build classnames conditionally
function clx(...parts) { return parts.filter(Boolean).join(" "); }

// button. variants cover default / primary / ghost / subtle / danger
export function Button({
  as: Tag = "button",
  variant = "default",
  size = "md",
  className = "",
  ...props
}) {
  const base =
    "inline-flex items-center justify-center gap-2 font-medium rounded-lg border transition-all duration-150 disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98]";
  const sizes = {
    sm: "h-8 px-2.5 text-[13px]",
    md: "h-9 px-3.5 text-sm",
    lg: "h-10 px-4 text-[15px]",
  };
  const variants = {
    default: "border-zinc-200 bg-white text-zinc-900 hover:bg-zinc-50 hover:border-zinc-300 shadow-card",
    primary:
      "border-accent-700/40 text-white bg-accent-grad shadow-[0_1px_2px_rgba(20,22,30,0.08),inset_0_1px_0_0_rgba(255,255,255,0.20)] " +
      "hover:brightness-[1.04] hover:shadow-[0_4px_12px_-2px_rgba(79,70,229,0.45),inset_0_1px_0_0_rgba(255,255,255,0.20)]",
    ghost: "border-transparent bg-transparent text-zinc-700 hover:bg-zinc-100",
    subtle: "border-zinc-200 bg-zinc-50 text-zinc-700 hover:bg-zinc-100",
    danger: "border-rose-200 bg-white text-rose-600 hover:bg-rose-50 shadow-card",
  };
  return (
    <Tag
      {...props}
      className={clx(base, sizes[size], variants[variant], className)}
    />
  );
}

// cards. plain Card for most things, FeatureCard for the dashboard hero
export function Card({ className = "", hover = false, children, ...rest }) {
  return (
    <div
      className={clx(
        "rounded-2xl border border-zinc-200/80 bg-white shadow-card",
        hover && "transition-all duration-200 hover:-translate-y-px hover:shadow-cardHover hover:border-zinc-300",
        className
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

export function FeatureCard({ className = "", children, ...rest }) {
  return (
    <div
      className={clx(
        "relative overflow-hidden rounded-2xl border border-zinc-200/80 bg-feature-tint shadow-feature",
        className
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

export function CardHeader({ title, action, description, icon: Icon, eyebrow }) {
  return (
    <div className="flex items-start justify-between gap-3 px-5 pt-4 pb-3">
      <div className="min-w-0">
        {eyebrow && (
          <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-400">
            {eyebrow}
          </div>
        )}
        <h3 className="flex items-center gap-2 text-[14px] font-semibold text-zinc-900">
          {Icon && (
            <span className="grid h-6 w-6 place-items-center rounded-md bg-accent-50 text-accent-600">
              <Icon size={13} />
            </span>
          )}
          {title}
        </h3>
        {description && (
          <p className="mt-1 text-[13px] text-zinc-500">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}

export function CardBody({ className = "", children }) {
  return <div className={clx("px-5 pb-5", className)}>{children}</div>;
}

// small status pill. used for urgency, frequency, role, etc.
export function Pill({ children, variant = "default", className = "" }) {
  const v = {
    default: "bg-zinc-100 text-zinc-700 ring-1 ring-inset ring-zinc-200/60",
    accent: "bg-accent-50 text-accent-700 ring-1 ring-inset ring-accent-200/70",
    success: "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200/60",
    warn: "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200/60",
    danger: "bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-200/60",
  };
  return (
    <span
      className={clx(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
        v[variant],
        className
      )}
    >
      {children}
    </span>
  );
}

// form fields. all three share the same look via inputBase
export function Field({ label, hint, children }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      {label && (
        <span className="text-[13px] font-medium text-zinc-700">{label}</span>
      )}
      {children}
      {hint && <span className="text-xs text-zinc-500">{hint}</span>}
    </label>
  );
}

const inputBase =
  "w-full h-10 rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-900 " +
  "placeholder:text-zinc-400 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.6)] " +
  "transition-colors focus:border-accent-500 focus:ring-2 focus:ring-accent-500/20 outline-none";

export function Input({ className = "", ...rest }) {
  return <input className={clx(inputBase, className)} {...rest} />;
}

export function Select({ className = "", children, ...rest }) {
  return (
    <select className={clx(inputBase, "pr-8", className)} {...rest}>
      {children}
    </select>
  );
}

export function Textarea({ className = "", rows = 3, ...rest }) {
  return (
    <textarea
      rows={rows}
      className={clx(inputBase, "h-auto py-2.5", className)}
      {...rest}
    />
  );
}

// modal. clicks outside or escape close it
export function Modal({ open, title, onClose, children }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-zinc-900/50 p-4 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl border border-zinc-200/80 bg-white shadow-pop animate-pop-in overflow-hidden"
      >
        <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-3.5">
          <h3 className="text-[14px] font-semibold text-zinc-900">{title}</h3>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700 transition-colors"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
      </div>
    </div>
  );
}

// empty state. icon in a halo + a friendly message
export function EmptyState({ icon: Icon, title, hint, action, compact = false }) {
  return (
    <div className={clx(
      "flex flex-col items-center justify-center gap-3 text-center",
      compact ? "px-4 py-8" : "px-6 py-14"
    )}>
      {Icon && (
        <div className="relative grid h-12 w-12 place-items-center">
          {/* halo */}
          <div className="absolute inset-0 rounded-full bg-accent-100/50 blur-md" />
          <div className="relative grid h-11 w-11 place-items-center rounded-full bg-gradient-to-b from-white to-accent-50 ring-1 ring-accent-200/70 text-accent-600 shadow-sm">
            <Icon size={18} />
          </div>
        </div>
      )}
      <div className="text-sm font-semibold text-zinc-800">{title}</div>
      {hint && <div className="text-[13px] text-zinc-500 max-w-sm leading-relaxed">{hint}</div>}
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}

// little keyboard-key chip, like ⌘K in the search slot
export function Kbd({ children }) {
  return (
    <kbd className="inline-flex h-5 min-w-[20px] items-center justify-center rounded border border-zinc-200 bg-zinc-50 px-1.5 text-[10.5px] font-medium text-zinc-500 shadow-[inset_0_-1px_0_0_rgba(0,0,0,0.04)]">
      {children}
    </kbd>
  );
}
