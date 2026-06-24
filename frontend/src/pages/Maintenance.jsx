// maintenance requests. report things, assign them, move them through statuses.
import { useEffect, useState } from "react";
import { Wrench, Plus, Trash2 } from "lucide-react";
import { api } from "../lib/api.js";
import { useToast } from "../lib/toast.jsx";
import {
  Button, Card, CardBody, EmptyState, Modal, Field, Input, Select, Textarea, Pill,
} from "../components/ui.jsx";
import PageHeader from "../components/PageHeader.jsx";
import { timeAgo } from "../lib/format.js";

export default function Maintenance({ ctx }) {
  const { house, members } = ctx;
  const { push } = useToast();
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);

  async function load() {
    setItems(await api.get(`/api/houses/${house.id}/maintenance`));
  }
  useEffect(() => { load(); }, [house.id]);

  async function update(id, patch) {
    await api.patch(`/api/houses/${house.id}/maintenance/${id}`, patch);
    load();
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="House · Upkeep"
        title="Maintenance"
        description="Report issues, assign them, track to resolution."
        action={
          <Button variant="primary" onClick={() => setOpen(true)}>
            <Plus size={14} /> New request
          </Button>
        }
      />

      {items.length === 0 ? (
        <Card><CardBody><EmptyState icon={Wrench} title="No maintenance requests" /></CardBody></Card>
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((m) => (
            <Card key={m.id}>
              <CardBody className="py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-sm font-semibold text-zinc-900">
                      <Wrench size={14} className="text-zinc-500" />
                      <span className="truncate">{m.title}</span>
                    </div>
                    {m.description && (
                      <p className="mt-1 text-sm text-zinc-700">{m.description}</p>
                    )}
                    <div className="mt-2 text-xs text-zinc-500">
                      Reported by {m.created_by_name} · {timeAgo(m.created_at)}
                      {m.assigned_to_name && ` · assigned to ${m.assigned_to_name}`}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <UrgencyPill u={m.urgency} />
                    <StatusPill s={m.status} />
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Select
                    value={m.status}
                    onChange={(e) => update(m.id, { status: e.target.value })}
                    className="w-auto h-8 text-[13px]"
                  >
                    <option value="reported">reported</option>
                    <option value="in_progress">in progress</option>
                    <option value="resolved">resolved</option>
                  </Select>
                  <Select
                    value={m.assigned_to || ""}
                    onChange={(e) => update(m.id, { assigned_to: e.target.value ? Number(e.target.value) : null })}
                    className="w-auto h-8 text-[13px]"
                  >
                    <option value="">Unassigned</option>
                    {members.map((mm) => (
                      <option key={mm.id} value={mm.id}>{mm.name}</option>
                    ))}
                  </Select>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={async () => {
                      if (!confirm("Delete this request?")) return;
                      await api.del(`/api/houses/${house.id}/maintenance/${m.id}`);
                      load();
                    }}
                  >
                    <Trash2 size={14} /> Delete
                  </Button>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      <NewMaintenanceModal
        open={open}
        onClose={() => setOpen(false)}
        members={members}
        houseId={house.id}
        onCreated={() => { setOpen(false); load(); }}
      />
    </div>
  );
}

function StatusPill({ s }) {
  if (s === "resolved") return <Pill variant="success">resolved</Pill>;
  if (s === "in_progress") return <Pill variant="warn">in progress</Pill>;
  return <Pill variant="accent">reported</Pill>;
}

function UrgencyPill({ u }) {
  if (u === "high") return <Pill variant="danger">high</Pill>;
  if (u === "low") return <Pill>low</Pill>;
  return <Pill>normal</Pill>;
}

function NewMaintenanceModal({ open, onClose, members, houseId, onCreated }) {
  const { push } = useToast();
  const [form, setForm] = useState({ title: "", description: "", urgency: "normal", assigned_to: "" });
  return (
    <Modal open={open} title="New maintenance request" onClose={onClose}>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          try {
            const body = { ...form };
            body.assigned_to = body.assigned_to ? Number(body.assigned_to) : null;
            await api.post(`/api/houses/${houseId}/maintenance`, body);
            push("Submitted", "success");
            onCreated();
            setForm({ title: "", description: "", urgency: "normal", assigned_to: "" });
          } catch (err) { push(err.message, "error"); }
        }}
        className="flex flex-col gap-3"
      >
        <Field label="Title">
          <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required placeholder="Kitchen faucet drips" />
        </Field>
        <Field label="Description">
          <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Urgency">
            <Select value={form.urgency} onChange={(e) => setForm({ ...form, urgency: e.target.value })}>
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
            </Select>
          </Field>
          <Field label="Assign to">
            <Select value={form.assigned_to} onChange={(e) => setForm({ ...form, assigned_to: e.target.value })}>
              <option value="">Nobody yet</option>
              {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </Select>
          </Field>
        </div>
        <Button variant="primary" className="mt-2">Create</Button>
      </form>
    </Modal>
  );
}
