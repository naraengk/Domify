import { useEffect, useMemo, useState } from "react";
import {
  ListChecks, Wallet, ShoppingBasket, BellRing, Plus,
  ChevronRight, ArrowUpRight, Sparkles, Calendar,
} from "lucide-react";
import { api } from "../lib/api.js";
import { useToast } from "../lib/toast.jsx";
import {
  Button, Card, CardHeader, CardBody, EmptyState, Pill, FeatureCard,
} from "../components/ui.jsx";
import KpiCard from "../components/KpiCard.jsx";
import { money, timeAgo } from "../lib/format.js";

// Dashboard landing page, Shows a personalized greeting, four KPI cards,
// and short lists of the user's pending chores and recent announcements

// Convert a list of timestamped records into a 7-day series, Each bucket
// represents one of the last seven calendar days and counts how many
// records fell on that date. Used to drive the sparklines in the KPI cards

function buildWeekSeries(items, tsField) {
  const buckets = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - (6 - i));
    return { date: d, y: 0, x: d.toLocaleDateString("en-US", { weekday: "short" })[0] };
  });
  for (const it of items) {
    const t = new Date(it[tsField]);
    for (const b of buckets) {
      if (t.toDateString() === b.date.toDateString()) { b.y += 1; break; }
    }
  }
  return buckets;
}

export default function Dashboard({ ctx, user, onGo }) {
  const { house } = ctx;
  const { push } = useToast();
  const [data, setData] = useState(null);

  // Fetch all dashboard data in parallel, Each request is wrapped in safe()
  // so that a single failed endpoint does not prevent the rest of the page
  // from rendering. A failed call resolves to an empty array, which the
  // section components already render as their normal empty state
  async function load() {
    const hid = house.id;
    const safe = async (p, label) => {
      try { return await p; }
      catch (e) { console.warn(`dashboard: ${label} failed`, e.message); return []; }
    };
    const [chores, balances, grocery, anns, history] = await Promise.all([
      safe(api.get(`/api/houses/${hid}/chores`), "chores"),
      safe(api.get(`/api/houses/${hid}/expenses/balances`), "balances"),
      safe(api.get(`/api/houses/${hid}/grocery`), "grocery"),
      safe(api.get(`/api/houses/${hid}/announcements`), "announcements"),
      safe(api.get(`/api/houses/${hid}/chores/history`), "history"),
    ]);
    setData({ chores, balances, grocery, anns, history });
  }
  useEffect(() => { load(); }, [house.id]);

  // The useMemo calls below must run on every render, including the first
  // one when `data` is still null, They are placed above the early return
  // so React's rules of hooks are not violated
  const choreSeries = useMemo(
    () => buildWeekSeries(data?.history || [], "completed_at"),
    [data?.history]
  );
  const grocerySeries = useMemo(
    () => buildWeekSeries(data?.grocery || [], "created_at"),
    [data?.grocery]
  );
  const annSeries = useMemo(
    () => buildWeekSeries(data?.anns || [], "created_at"),
    [data?.anns]
  );

  if (!data) return <Skeleton />;

  const firstName = (user?.name || "").split(" ")[0] || "there";
  // Greeting that adjusts to the current hour, Small detail but it makes
  // the dashboard feel more responsive to the user
  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 5) return "Up late";
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  })();
  const today = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  const myPending = data.chores.filter((c) => c.assigned_to === user.id);
  const overdue = myPending.filter((c) => c.is_overdue);
  const needed = data.grocery.filter((g) => !g.is_bought);
  const unread = data.anns.filter((a) => !a.is_read);
  const myBal = data.balances.find((b) => b.user_id === user.id);

  // Totals derived from the seven-day series, Used as the headline numbers
  // on the corresponding KPI cards
  const choresThisWeek = choreSeries.reduce((a, b) => a + b.y, 0);
  const annsThisWeek = annSeries.reduce((a, b) => a + b.y, 0);

  return (
    <div className="flex flex-col gap-7">
      {/* hero band, dark blue gradient backdrop
          fancy-hero adds the slow revolving color wheel and hover shake */}
      <FeatureCard className="fancy-hero px-6 py-6 sm:px-8 sm:py-7 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-700/90 via-blue-600/85 to-blue-900/90 pointer-events-none" />
        {/* the revolving wheel sits over the base gradient.
            mix-blend-screen keeps it soft instead of muddy */}
        <div className="absolute inset-0 hero-revolve pointer-events-none mix-blend-screen opacity-60" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.12),transparent_55%)] pointer-events-none" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between text-white">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-medium text-blue-100">
              <Calendar size={12} />
              {today}
            </div>
            <h1 className="mt-1.5 text-3xl font-semibold tracking-tight leading-tight">
              {greeting}, {firstName}.
            </h1>
            <p className="mt-1 text-sm text-blue-100/90 max-w-xl">
              {overdue.length > 0
                ? `${overdue.length} of your chores are overdue. Knock one out?`
                : myPending.length > 0
                  ? `You have ${myPending.length} pending chore${myPending.length === 1 ? "" : "s"}. House balance is ${myBal ? money(myBal.net) : "$0"}.`
                  : "All caught up. Here's a snapshot of the house."}
            </p>
            <div className="mt-4 flex flex-wrap gap-1.5">
              {myPending.length > 0 && (
                <Pill variant="accent">
                  <ListChecks size={11} /> {myPending.length} pending
                </Pill>
              )}
              {overdue.length > 0 && (
                <Pill variant="danger">
                  {overdue.length} overdue
                </Pill>
              )}
              {needed.length > 0 && (
                <Pill>
                  <ShoppingBasket size={11} /> {needed.length} on list
                </Pill>
              )}
              {unread.length > 0 && (
                <Pill variant="warn">
                  <BellRing size={11} /> {unread.length} unread
                </Pill>
              )}
              {myPending.length + overdue.length + needed.length + unread.length === 0 && (
                <Pill variant="success">
                  <Sparkles size={11} /> Nothing on your plate
                </Pill>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2 shrink-0">
            {/* mini stats embedded in hero */}
            <div className="hidden sm:flex gap-2 mr-2">
              <MiniStat label="Chores" value={myPending.length} />
              <MiniStat label="Balance" value={myBal ? money(myBal.net) : "$0"} />
              <MiniStat label="Grocery" value={needed.length} />
            </div>
            <Button variant="primary" className="bg-white/15 border-white/25 text-white hover:bg-white/25" onClick={() => onGo("expenses")}>
              <Plus size={14} /> Add expense
            </Button>
            {/* blue chore button so it stands out from announce */}
            <Button
              variant="primary"
              className="bg-blue-600 border-blue-700 hover:bg-blue-700"
              onClick={() => onGo("chores")}
            >
              <Plus size={14} /> Add chore
            </Button>
            {/* white announce button, reads as a plain card on the blue hero */}
            <Button
              className="bg-white border-white text-zinc-800 hover:bg-zinc-50"
              onClick={() => onGo("announcements")}
            >
              <Plus size={14} /> Announce
            </Button>
          </div>
        </div>
      </FeatureCard>

      {/* KPI row */}
      <section>
        <div className="mb-2 flex items-baseline justify-between">
          <h2 className="text-[13px] font-semibold uppercase tracking-[0.08em] text-zinc-500">
            This week
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiCard
            label="Chores done"
            value={choresThisWeek}
            icon={ListChecks}
            tone="accent"
            delta={choresThisWeek - 0 /* baseline */}
            deltaSuffix=""
            hint="this week"
            series={choreSeries}
            sparkLabel="Done: "
          />
          <KpiCard
            label="Your balance"
            value={myBal ? money(myBal.net) : "$0.00"}
            icon={Wallet}
            tone={myBal?.net > 0.01 ? "success" : myBal?.net < -0.01 ? "danger" : "default"}
            hint={myBal?.net > 0.01 ? "owed to you" : myBal?.net < -0.01 ? "you owe" : "settled up"}
            cta={
              myBal && myBal.net < -0.01 ? (
                <Button size="sm" variant="subtle" className="w-full" onClick={() => onGo("expenses")}>
                  Settle now
                </Button>
              ) : null
            }
          />
          <KpiCard
            label="Grocery items"
            value={needed.length}
            icon={ShoppingBasket}
            tone="default"
            hint="to buy"
            series={grocerySeries}
            sparkLabel="Added: "
          />
          <KpiCard
            label="Unread"
            value={unread.length}
            icon={BellRing}
            tone={unread.length ? "warn" : "default"}
            hint={annsThisWeek > 0 ? `${annsThisWeek} posted` : "all caught up"}
          />
        </div>
      </section>

      {/* two column work area */}
      <div className="grid lg:grid-cols-5 gap-4">
        <Card hover className="lg:col-span-3">
          <CardHeader
            title="Your chores"
            icon={ListChecks}
            description={myPending.length === 0 ? "Nothing on your plate." : `${myPending.length} pending · ${overdue.length} overdue`}
            action={
              <Button size="sm" variant="ghost" onClick={() => onGo("chores")}>
                Open <ChevronRight size={14} />
              </Button>
            }
          />
          <CardBody className="pt-0">
            {myPending.length === 0 ? (
              <EmptyState
                icon={ListChecks}
                title="All caught up"
                hint="When you're assigned a chore it will show up here."
                compact
              />
            ) : (
              <ul className="divide-y divide-zinc-100">
                {myPending.slice(0, 5).map((c) => (
                  <li key={c.id} className="group flex items-center justify-between gap-3 py-2.5 px-2 -mx-2 rounded-lg hover:bg-zinc-50/80 transition-colors">
                    <div className="min-w-0 flex items-center gap-3">
                      <span className={
                        "grid h-8 w-8 place-items-center rounded-lg ring-1 " +
                        (c.is_overdue
                          ? "bg-rose-50 text-rose-600 ring-rose-200"
                          : "bg-accent-50 text-accent-600 ring-accent-200")
                      }>
                        <ListChecks size={14} />
                      </span>
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-zinc-900 truncate">{c.name}</div>
                        <div className="text-xs text-zinc-500">
                          {c.is_overdue ? "Overdue" : c.due_date ? `Due ${new Date(c.due_date).toLocaleDateString()}` : "Due soon"}
                          {c.frequency ? ` · ${c.frequency}` : ""}
                        </div>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={async () => {
                        await api.post(`/api/houses/${house.id}/chores/${c.id}/complete`);
                        push("Marked done", "success");
                        load();
                      }}
                    >
                      Mark done
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        <Card hover className="lg:col-span-2">
          <CardHeader
            title="Latest announcements"
            icon={BellRing}
            description={data.anns.length === 0 ? "Nothing yet." : `${unread.length} unread`}
            action={
              <Button size="sm" variant="ghost" onClick={() => onGo("announcements")}>
                Open <ChevronRight size={14} />
              </Button>
            }
          />
          <CardBody className="pt-0">
            {data.anns.length === 0 ? (
              <EmptyState
                icon={BellRing}
                title="No announcements"
                hint="Plumber on Tuesday? Quiet week? Post a heads-up."
                compact
              />
            ) : (
              <ul className="divide-y divide-zinc-100">
                {data.anns.slice(0, 5).map((a) => (
                  <li key={a.id} className="flex items-start justify-between gap-3 py-2.5 px-2 -mx-2 rounded-lg hover:bg-zinc-50/80 transition-colors">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-sm font-medium text-zinc-900">
                        {!a.is_read && <span className="h-1.5 w-1.5 rounded-full bg-accent-500" />}
                        <span className="truncate">{a.title}</span>
                      </div>
                      <div className="text-xs text-zinc-500 mt-0.5">
                        {a.created_by_name} · {timeAgo(a.created_at)}
                      </div>
                    </div>
                    <UrgencyPill urgency={a.urgency} />
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>

      {/* tertiary callout */}
      <Card hover>
        <div className="flex items-center justify-between gap-4 px-5 py-4">
          <div className="flex items-center gap-3 min-w-0">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-accent-50 text-accent-700 ring-1 ring-accent-200">
              <BarChart3Icon />
            </span>
            <div className="min-w-0">
              <div className="text-sm font-semibold text-zinc-900">See spending insights</div>
              <div className="text-xs text-zinc-500">
                By category, month over month, and per roommate contribution.
              </div>
            </div>
          </div>
          <Button variant="ghost" onClick={() => onGo("insights")}>
            View insights <ArrowUpRight size={14} />
          </Button>
        </div>
      </Card>
    </div>
  );
}

// Small inline SVG icon, Defined locally to avoid importing yet another icon for a single use
function BarChart3Icon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3v18h18" /><path d="M7 16v-7" /><path d="M12 16v-4" /><path d="M17 16V8" />
    </svg>
  );
}

function MiniStat({ label, value }) {
  return (
    <div className="rounded-xl bg-white/10 backdrop-blur px-3 py-2 ring-1 ring-white/20">
      <div className="text-[10px] uppercase tracking-wide text-blue-100/80">{label}</div>
      <div className="text-sm font-semibold tnum">{value}</div>
    </div>
  );
}

function UrgencyPill({ urgency }) {
  if (urgency === "high") return <Pill variant="danger">high</Pill>;
  if (urgency === "low") return <Pill>low</Pill>;
  return <Pill variant="accent">normal</Pill>;
}

function Skeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-40 rounded-2xl bg-zinc-100/70" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[0,1,2,3].map(i => <div key={i} className="h-28 rounded-2xl bg-zinc-100/70" />)}
      </div>
      <div className="grid lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3 h-64 rounded-2xl bg-zinc-100/70" />
        <div className="lg:col-span-2 h-64 rounded-2xl bg-zinc-100/70" />
      </div>
    </div>
  );
}
