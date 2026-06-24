import { ArrowUp, ArrowDown, Minus } from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, YAxis, Tooltip } from "recharts";

// the little stat cards on the dashboard.
// shows an icon, a label, the big number, an optional delta, and an
// optional little sparkline at the bottom. pass `series` to draw it.

// color presets for the icon box + the sparkline stroke/fill
const TONE = {
  default: { bg: "bg-zinc-100", fg: "text-zinc-600", stroke: "#a1a1aa", fill: "#e4e4e7" },
  accent:  { bg: "bg-accent-100", fg: "text-accent-700", stroke: "#6366f1", fill: "#c7d2fe" },
  success: { bg: "bg-emerald-100/70", fg: "text-emerald-700", stroke: "#10b981", fill: "#a7f3d0" },
  warn:    { bg: "bg-amber-100/70", fg: "text-amber-700", stroke: "#f59e0b", fill: "#fde68a" },
  danger:  { bg: "bg-rose-100/60", fg: "text-rose-700", stroke: "#f43f5e", fill: "#fecdd3" },
};

// little +/- chip showing change vs. some baseline
function Delta({ value, suffix = "" }) {
  if (value == null) return null;
  if (Math.abs(value) < 0.001) {
    return (
      <span className="inline-flex items-center gap-0.5 rounded-md bg-zinc-100 px-1.5 py-0.5 text-[11px] font-medium text-zinc-500">
        <Minus size={11} /> No change
      </span>
    );
  }
  const positive = value > 0;
  return (
    <span
      className={
        "inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[11px] font-medium " +
        (positive ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700")
      }
    >
      {positive ? <ArrowUp size={11} /> : <ArrowDown size={11} />}
      {positive ? "+" : ""}
      {value}
      {suffix}
    </span>
  );
}

export default function KpiCard({
  label,
  value,
  icon: Icon,
  tone = "default",
  delta = null,
  deltaSuffix = "",
  hint,
  series = null,        // [{x, y}, ...] optional
  sparkLabel = "",
}) {
  const t = TONE[tone] || TONE.default;
  const gradId = `g-${label?.replace(/\s+/g, "-").toLowerCase()}`;

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-card transition-all duration-200 hover:-translate-y-px hover:shadow-cardHover">
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            {Icon && (
              <span className={"grid h-7 w-7 place-items-center rounded-lg " + t.bg + " " + t.fg}>
                <Icon size={14} />
              </span>
            )}
            <span className="text-[12.5px] font-medium text-zinc-500">{label}</span>
          </div>
          <Delta value={delta} suffix={deltaSuffix} />
        </div>

        <div className="mt-3 flex items-baseline gap-2">
          <div className="text-[28px] font-semibold tracking-tight leading-none text-zinc-900 tnum">
            {value}
          </div>
          {hint && <span className="text-[12px] text-zinc-400">{hint}</span>}
        </div>
      </div>

      {series && series.length > 1 && (
        <div className="h-12 -mt-2">
          <ResponsiveContainer>
            <AreaChart data={series} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={t.stroke} stopOpacity={0.32} />
                  <stop offset="100%" stopColor={t.stroke} stopOpacity={0} />
                </linearGradient>
              </defs>
              <YAxis hide domain={["dataMin", "dataMax"]} />
              <Tooltip
                cursor={false}
                content={({ active, payload }) =>
                  active && payload && payload[0] ? (
                    <div className="rounded-md border border-zinc-200 bg-white px-2 py-1 text-[11px] text-zinc-700 shadow-sm">
                      {sparkLabel}{payload[0].value}
                    </div>
                  ) : null
                }
              />
              <Area
                type="monotone"
                dataKey="y"
                stroke={t.stroke}
                strokeWidth={1.75}
                fill={`url(#${gradId})`}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
