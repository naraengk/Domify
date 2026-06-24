// chore list + leaderboard + recent activity. "mark done" auto-rotates the next assignee.
import { useEffect, useState } from "react";
import { Plus, Brush, Trash2, Trophy, Clock, RotateCw, ChevronRight } from "lucide-react";
import { api } from "../lib/api.js";
import { useToast } from "../lib/toast.jsx";
import {
  Button, Card, CardHeader, CardBody, EmptyState, Modal, Field, Input, Select, Pill, Textarea,
} from "../components/ui.jsx";
import PageHeader from "../components/PageHeader.jsx";
import { timeAgo } from "../lib/format.js";

export default function Chores({ ctx }) {
  const { house, members } = ctx;
  const { push } = useToast();
  const [chores, setChores] = useState([]);
  const [summary, setSummary] = useState([]);
  const [history, setHistory] = useState([]);
  const [open, setOpen] = useState(false);

  async function load() {
    const hid = house.id;
    const [c, s, h] = await Promise.all([
      api.get(`/api/houses/${hid}/chores`),
      api.get(`/api/houses/${hid}/chores/summary`),
      api.get(`/api/houses/${hid}/chores/history`),
    ]);
    setChores(c); setSummary(s); setHistory(h);
  }
  useEffect(() => { load(); }, [house.id]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="House · Operations"
        title="Chores"
        description="Set up rotations. The schedule advances automatically as people complete their share."
        action={
          <Button variant="primary" onClick={() => setOpen(true)}>
            <Plus size={14} /> New chore
          </Button>
        }
      />

      <Card>
        <CardBody className="px-0 py-0">
          {chores.length === 0 ? (
            <EmptyState
              icon={Brush}
              title="No chores yet"
              hint="Add the first chore. Everyone takes a turn. Domify rotates the assignee."
              action={
                <Button variant="primary" onClick={() => setOpen(true)}>
                  <Plus size={14} /> Add chore
                </Button>
              }
            />
          ) : (
            <ul className="divide-y divide-zinc-100">
              {chores.map((c) => (
                <li key={c.id} className="group flex items-center justify-between gap-3 px-5 py-3 hover:bg-zinc-50/60 transition-colors">
                  <div className="min-w-0 flex items-center gap-3">
                    <span className={
                      "grid h-9 w-9 place-items-center rounded-lg ring-1 " +
                      (c.is_overdue
                        ? "bg-rose-50 text-rose-600 ring-rose-200"
                        : "bg-accent-50 text-accent-600 ring-accent-200")
                    }>
                      <Brush size={15} />
                    </span>
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-zinc-900 truncate">{c.name}</div>
                      <div className="text-xs text-zinc-500">
                        Assigned to <span className="font-medium text-zinc-700">{c.assigned_to_name || "Unassigned"}</span>
                        {c.due_date && ` · due ${new Date(c.due_date).toLocaleDateString()}`}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {c.is_overdue ? <Pill variant="danger">overdue</Pill> : <Pill>{c.frequency}</Pill>}
                    {c.auto_rotate && (
                      <span className="text-zinc-400" title="Auto-rotates">
                        <RotateCw size={13} />
                      </span>
                    )}
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={async () => {
                        await api.post(`/api/houses/${house.id}/chores/${c.id}/complete`);
                        push("Marked done", "success");
                        load();
                      }}
                    >
                      Mark done
                    </Button>
                    <button
                      className="rounded-md p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-rose-600 transition-colors"
                      onClick={async () => {
                        if (!confirm("Delete this chore?")) return;
                        await api.del(`/api/houses/${house.id}/chores/${c.id}`);
                        load();
                      }}
                      aria-label="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card hover>
          <CardHeader title="This week's leaderboard" icon={Trophy} description="Who's been doing the work." />
          <CardBody className="pt-0">
            {summary.length === 0 || summary.every((s) => s.completed_this_week === 0) ? (
              <EmptyState icon={Trophy} title="No completions this week" compact />
            ) : (
              <ul className="divide-y divide-zinc-100">
                {summary.map((s, i) => (
                  <li key={s.user_id} className="flex items-center justify-between py-2.5 text-sm">
                    <div className="flex items-center gap-3">
                      <span className={
                        "grid h-7 w-7 place-items-center rounded-lg text-[12px] font-semibold " +
                        (i === 0 ? "bg-gradient-to-b from-amber-100 to-amber-200 text-amber-800 ring-1 ring-amber-200"
                         : i === 1 ? "bg-zinc-100 text-zinc-700 ring-1 ring-zinc-200"
                         : i === 2 ? "bg-orange-50 text-orange-700 ring-1 ring-orange-200"
                         : "bg-zinc-50 text-zinc-500 ring-1 ring-zinc-200")
                      }>
                        {i + 1}
                      </span>
                      <span className="font-medium text-zinc-800">{s.user_name}</span>
                    </div>
                    <span className="text-zinc-500 tnum">{s.completed_this_week} done</span>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        <Card hover>
          <CardHeader title="Recent activity" icon={Clock} />
          <CardBody className="pt-0">
            {history.length === 0 ? (
              <EmptyState icon={Clock} title="Nothing here yet" compact />
            ) : (
              <ul className="divide-y divide-zinc-100">
                {history.slice(0, 10).map((h) => (
                  <li key={h.id} className="flex items-center justify-between py-2.5 text-sm">
                    <span className="text-zinc-700 truncate">
                      <span className="font-medium text-zinc-900">{h.completed_by_name}</span>{" "}
                      did <span className="text-zinc-500">{h.chore_name}</span>
                    </span>
                    <span className="text-xs text-zinc-500">{timeAgo(h.completed_at)}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>

      <NewChoreModal
        open={open} onClose={() => setOpen(false)}
        members={members} houseId={house.id}
        onCreated={() => { setOpen(false); load(); }}
      />
    </div>
  );
}

function NewChoreModal({ open, onClose, members, houseId, onCreated }) {
  const { push } = useToast();
  const [form, setForm] = useState({ name: "", description: "", frequency: "weekly", assigned_to: "", auto_rotate: true });
  return (
    <Modal open={open} title="New chore" onClose={onClose}>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          try {
            const body = { ...form };
            if (body.assigned_to === "") delete body.assigned_to;
            else body.assigned_to = Number(body.assigned_to);
            await api.post(`/api/houses/${houseId}/chores`, body);
            push("Chore added", "success");
            onCreated();
            setForm({ name: "", description: "", frequency: "weekly", assigned_to: "", auto_rotate: true });
          } catch (err) { push(err.message, "error"); }
        }}
        className="flex flex-col gap-3"
      >
        <Field label="Name">
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder="Take out trash" />
        </Field>
        <Field label="Description">
          <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="optional" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Frequency">
            <Select value={form.frequency} onChange={(e) => setForm({ ...form, frequency: e.target.value })}>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </Select>
          </Field>
          <Field label="Assign to">
            <Select value={form.assigned_to} onChange={(e) => setForm({ ...form, assigned_to: e.target.value })}>
              <option value="">First member, then rotate</option>
              {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </Select>
          </Field>
        </div>
        <label className="flex items-center gap-2 text-sm text-zinc-700">
          <input
            type="checkbox"
            checked={form.auto_rotate}
            onChange={(e) => setForm({ ...form, auto_rotate: e.target.checked })}
            className="h-4 w-4 rounded border-zinc-300 text-accent-600 focus:ring-accent-500"
          />
          Auto-rotate after each completion
        </label>
        <Button variant="primary" className="mt-2">Create chore</Button>
      </form>
    </Modal>
  );
}
