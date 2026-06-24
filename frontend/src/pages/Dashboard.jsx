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

// dashboard landing page. heroish greeting + 4 kpi cards + two lists.

// turn a list of timestamped things into a 7-day count, one bucket per day.
// used to draw the little sparklines on the kpi cards.
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

  // grab everything we need for the dashboard in parallel
  async function load() {
    const hid = house.id;
    const [chores, balances, grocery, anns, history] = await Promise.all([
      api.get(`/api/houses/${hid}/chores`),
      api.get(`/api/houses/${hid}/expenses/balances`),
      api.get(`/api/houses/${hid}/grocery`),
      api.get(`/api/houses/${hid}/announcements`),
      api.get(`/api/houses/${hid}/chores/history`),
    ]);
    setData({ chores, balances, grocery, anns, history });
  }
  useEffect(() => { load(); }, [house.id]);

  // hooks must run on every render, so keep them above the early return
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
  // greeting that shifts with time of day. tiny touch but it makes the page feel alive.
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

  // deltas: this-week-so-far vs prior 7-day average
  const choresThisWeek = choreSeries.reduce((a, b) => a + b.y, 0);
  const annsThisWeek = annSeries.reduce((a, b) => a + b.y, 0);

  return (
    <div className="flex flex-col gap-7">
      {/* hero band */}
      <FeatureCard className="px-6 py-6 sm:px-8 sm:py-7">
        <div className="absolute inset-0 bg-hero-halo pointer-events-none" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-1.5 text-[12px] font-medium text-zinc-500">
              <Calendar size={12} className="text-accent-500" />
              {today}
            </div>
            <h1 className="mt-1.5 text-[28px] sm:text-[30px] font-semibold tracking-tight text-zinc-900 leading-tight">
              {greeting}, {firstName}.
            </h1>
            <p className="mt-1 text-[14px] text-zinc-500 max-w-xl">
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
            <Button variant="primary" onClick={() => onGo("expenses")}>
              <Plus size={14} /> Add expense
            </Button>
            <Button onClick={() => onGo("chores")}>
              <Plus size={14} /> Add chore
            </Button>
            <Button variant="ghost" onClick={() => onGo("announcements")}>
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

// small inline icon, avoids another import
function BarChart3Icon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3v18h18" /><path d="M7 16v-7" /><path d="M12 16v-4" /><path d="M17 16V8" />
    </svg>
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
