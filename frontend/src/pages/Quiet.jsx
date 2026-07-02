import { useEffect, useState } from "react";
import { Moon, Clock, AlertTriangle, ShieldAlert } from "lucide-react";
import { api } from "../lib/api.js";
import { useToast } from "../lib/toast.jsx";
import {
  Button, Card, CardHeader, CardBody, EmptyState, Field, Input, Select, Textarea, LoadingCard,
} from "../components/ui.jsx";
import PageHeader from "../components/PageHeader.jsx";
import { timeAgo } from "../lib/format.js";

// quiet hours page
// admins set the agreement, anyone can log a violation

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function Quiet({ ctx }) {
  const { house, members } = ctx;
  const { push } = useToast();
  const [hours, setHours] = useState({ start_time: "22:00", end_time: "08:00", days: "Mon,Tue,Wed,Thu,Sun" });
  const [violations, setViolations] = useState(null);
  const [vForm, setVForm] = useState({ offender: "", description: "" });
  const isAdmin = house.role === "admin";

  async function load() {
    const [h, v] = await Promise.all([
      api.get(`/api/houses/${house.id}/quiet/hours`),
      api.get(`/api/houses/${house.id}/quiet/violations`),
    ]);
    setHours(h); setViolations(v);
  }
  useEffect(() => { load(); }, [house.id]);

  const activeDays = (hours.days || "").split(",").map((d) => d.trim());

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="House · Rules"
        title="Quiet hours"
        description="Set the agreed-on hours, log violations neutrally."
      />

      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader title="Agreement" icon={Clock} description={isAdmin ? "Admins can edit." : "Only admins can edit."} />
          <CardBody className="pt-0">
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                try {
                  const next = await api.put(`/api/houses/${house.id}/quiet/hours`, hours);
                  setHours(next);
                  push("Saved", "success");
                } catch (err) { push(err.message, "error"); }
              }}
              className="flex flex-col gap-3"
            >
              <div className="grid grid-cols-2 gap-3">
                <Field label="From">
                  <Input type="time" value={hours.start_time} onChange={(e) => setHours({ ...hours, start_time: e.target.value })} disabled={!isAdmin} />
                </Field>
                <Field label="To">
                  <Input type="time" value={hours.end_time} onChange={(e) => setHours({ ...hours, end_time: e.target.value })} disabled={!isAdmin} />
                </Field>
              </div>
              <div>
                <div className="text-[13px] font-medium text-zinc-700 mb-1.5">Days</div>
                <div className="flex flex-wrap gap-1.5">
                  {DAYS.map((d) => {
                    const on = activeDays.includes(d);
                    return (
                      <button
                        key={d}
                        type="button"
                        disabled={!isAdmin}
                        onClick={() => {
                          const next = on ? activeDays.filter((x) => x !== d) : [...activeDays, d];
                          // keep order canonical
                          const ordered = DAYS.filter((x) => next.includes(x));
                          setHours({ ...hours, days: ordered.join(",") });
                        }}
                        className={
                          "h-8 px-3 rounded-md text-[12px] font-medium transition-colors " +
                          (on
                            ? "bg-accent-50 text-accent-700 border border-accent-200"
                            : "bg-zinc-50 text-zinc-500 border border-zinc-200 hover:bg-zinc-100") +
                          (!isAdmin ? " opacity-60 cursor-not-allowed" : "")
                        }
                      >
                        {d}
                      </button>
                    );
                  })}
                </div>
              </div>
              <Button variant="primary" disabled={!isAdmin} className="mt-2">Save agreement</Button>
            </form>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Log a violation" icon={AlertTriangle} />
          <CardBody className="pt-0">
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                try {
                  await api.post(`/api/houses/${house.id}/quiet/violations`, {
                    offender: vForm.offender ? Number(vForm.offender) : null,
                    description: vForm.description,
                  });
                  push("Logged", "success");
                  setVForm({ offender: "", description: "" });
                  load();
                } catch (err) { push(err.message, "error"); }
              }}
              className="flex flex-col gap-3"
            >
              <Field label="Offender (optional)">
                <Select value={vForm.offender} onChange={(e) => setVForm({ ...vForm, offender: e.target.value })}>
                  <option value="">Anyone</option>
                  {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                </Select>
              </Field>
              <Field label="What happened">
                <Textarea value={vForm.description} onChange={(e) => setVForm({ ...vForm, description: e.target.value })} placeholder="Music past 1am on Tuesday" />
              </Field>
              <Button className="mt-2">Log</Button>
            </form>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader title="Violation history" icon={ShieldAlert} />
        <CardBody className="pt-0 px-0">
          {violations === null ? (
            <div className="p-5"><LoadingCard rows={2} /></div>
          ) : violations.length === 0 ? (
            <EmptyState icon={ShieldAlert} title="No violations logged" hint="Nice." />
          ) : (
            <ul className="divide-y divide-zinc-100">
              {violations.map((v) => (
                <li key={v.id} className="px-5 py-3 text-sm">
                  <div className="text-zinc-900">
                    <span className="font-medium">{v.offender_name || "Unknown"}</span>
                    {v.description && <span className="text-zinc-700">: {v.description}</span>}
                  </div>
                  <div className="mt-0.5 text-xs text-zinc-500">
                    Reported by {v.reported_by_name} · {timeAgo(v.occurred_at)}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
