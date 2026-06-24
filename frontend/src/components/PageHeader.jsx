// the header that sits at the top of every page.
// eyebrow + h1 + short description + optional action button on the right.

export default function PageHeader({ eyebrow, title, description, action, children }) {
  return (
    <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow && (
          <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-accent-600">
            {eyebrow}
          </div>
        )}
        <h1 className="text-[26px] font-semibold tracking-tight text-zinc-900 leading-tight">
          {title}
        </h1>
        {description && (
          <p className="mt-1 text-[14px] text-zinc-500 max-w-2xl">{description}</p>
        )}
        {children}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </header>
  );
}
