import { useEffect, useState } from "react";
import { PieChart, BarChart3, Users } from "lucide-react";
import {
  ResponsiveContainer, PieChart as RPieChart, Pie, Cell, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from "recharts";
import { api } from "../lib/api.js";
import { Card, CardHeader, CardBody, EmptyState } from "../components/ui.jsx";
import PageHeader from "../components/PageHeader.jsx";
import { money } from "../lib/format.js";

// insights page. spend by category, monthly bar chart, and contribution bars.

// chart colors. shades of the accent then drops to gray for less-important slices.
const COLORS = ["#4f46e5", "#6366f1", "#818cf8", "#a5b4fc", "#d4d4d8", "#a1a1aa", "#71717a", "#52525b"];

export default function Insights({ ctx }) {
  const { house } = ctx;
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get(`/api/houses/${house.id}/expenses/insights`).then(setData);
  }, [house.id]);

  if (!data) return <div className="h-64 rounded-xl bg-zinc-100 animate-pulse" />;

  const maxByUser = Math.max(...data.by_user.map((r) => r.total), 1);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="House · Analytics"
        title="Insights"
        description="Spending by category, by month, and by roommate."
      />

      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader title="By category" icon={PieChart} />
          <CardBody>
            {data.by_category.length === 0 ? (
              <EmptyState icon={PieChart} title="No data yet" />
            ) : (
              <div className="h-64">
                <ResponsiveContainer>
                  <RPieChart>
                    <Pie
                      data={data.by_category}
                      dataKey="total"
                      nameKey="category"
                      innerRadius="55%"
                      outerRadius="80%"
                      strokeWidth={0}
                    >
                      {data.by_category.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(v) => money(v)}
                      contentStyle={{
                        border: "1px solid #e4e4e7", borderRadius: 8,
                        fontSize: 12, padding: "6px 10px",
                      }}
                    />
                  </RPieChart>
                </ResponsiveContainer>
              </div>
            )}
            <ul className="mt-3 grid grid-cols-2 gap-2">
              {data.by_category.map((c, i) => (
                <li key={c.category} className="flex items-center gap-2 text-xs text-zinc-600">
                  <span className="h-2 w-2 rounded-sm" style={{ background: COLORS[i % COLORS.length] }} />
                  <span className="truncate">{c.category}</span>
                  <span className="ml-auto font-medium text-zinc-800">{money(c.total)}</span>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Month over month" icon={BarChart3} />
          <CardBody>
            {data.monthly.length === 0 ? (
              <EmptyState icon={BarChart3} title="No monthly data yet" />
            ) : (
              <div className="h-64">
                <ResponsiveContainer>
                  <BarChart data={data.monthly} margin={{ top: 10, right: 8, left: 0, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#71717a" }} tickLine={false} axisLine={{ stroke: "#e4e4e7" }} />
                    <YAxis tick={{ fontSize: 11, fill: "#71717a" }} tickLine={false} axisLine={false} />
                    <Tooltip
                      formatter={(v) => money(v)}
                      contentStyle={{
                        border: "1px solid #e4e4e7", borderRadius: 8,
                        fontSize: 12, padding: "6px 10px",
                      }}
                    />
                    <Bar dataKey="total" fill="#4f46e5" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader title="Per roommate contribution" icon={Users} />
        <CardBody className="pt-0">
          {data.by_user.length === 0 ? (
            <EmptyState icon={Users} title="No data" />
          ) : (
            <ul className="divide-y divide-zinc-100">
              {data.by_user.map((r) => {
                const pct = Math.round((r.total / maxByUser) * 100);
                return (
                  <li key={r.user_id} className="py-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-zinc-800">{r.user_name}</span>
                      <span className="font-semibold text-zinc-900">{money(r.total)}</span>
                    </div>
                    <div className="mt-1.5 h-1.5 rounded-full bg-zinc-100 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-accent-500 to-accent-700 rounded-full"
                        style={{ width: pct + "%" }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
