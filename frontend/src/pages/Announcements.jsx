// announcements feed, cards have a colored left bar based on urgency
// hovering over an unread one marks it read
import { useEffect, useState } from "react";
import { Megaphone, Plus, Pin, Trash2, Pencil } from "lucide-react";
import { api } from "../lib/api.js";
import { useToast } from "../lib/toast.jsx";
import {
  Button, Card, CardBody, EmptyState, Modal, Field, Input, Textarea, Select, Pill, LoadingCard,
} from "../components/ui.jsx";
import PageHeader from "../components/PageHeader.jsx";
import { timeAgo } from "../lib/format.js";

export default function Announcements({ ctx, user }) {
  const { house } = ctx;
  const { push } = useToast();
  const [items, setItems] = useState(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const isAdmin = house.role === "admin";

  async function load() {
    setItems(await api.get(`/api/houses/${house.id}/announcements`));
  }
  useEffect(() => { load(); }, [house.id]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="House · Comms"
        title="Announcements"
        description="Heads-ups, plumber visits, that kind of thing."
        action={
          <Button variant="primary" onClick={() => setOpen(true)}>
            <Plus size={14} /> New
          </Button>
        }
      />

      {items === null ? (
        <LoadingCard />
      ) : items.length === 0 ? (
        <Card><CardBody><EmptyState icon={Megaphone} title="No announcements yet" /></CardBody></Card>
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((a) => (
            <AnnouncementItem
              key={a.id}
              a={a}
              isAdmin={isAdmin}
              canEdit={user && (a.created_by === user.id || isAdmin)}
              onEdit={() => setEditing(a)}
              houseId={house.id}
              onChange={load}
            />
          ))}
        </div>
      )}

      <NewAnnouncementModal
        open={open}
        onClose={() => setOpen(false)}
        isAdmin={isAdmin}
        houseId={house.id}
        onCreated={() => { setOpen(false); load(); }}
      />

      <EditAnnouncementModal
        ann={editing}
        onClose={() => setEditing(null)}
        houseId={house.id}
        onSaved={() => { setEditing(null); load(); }}
      />
    </div>
  );
}

function AnnouncementItem({ a, isAdmin, canEdit, onEdit, houseId, onChange }) {
  const accentBar =
    a.urgency === "high" ? "before:bg-rose-500"
    : a.urgency === "low" ? "before:bg-zinc-300"
    : "before:bg-accent-600";

  return (
    <Card
      className={
        "relative overflow-hidden " +
        "before:absolute before:inset-y-0 before:left-0 before:w-1 " + accentBar +
        (a.is_pinned ? " bg-amber-50/40 border-amber-200" : "")
      }
      onMouseEnter={() => {
        if (!a.is_read) api.post(`/api/houses/${houseId}/announcements/${a.id}/read`).catch(() => {});
      }}
    >
      <div className="p-4 pl-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-sm font-semibold text-zinc-900">
              {!a.is_read && <span className="h-1.5 w-1.5 rounded-full bg-accent-500" />}
              {a.is_pinned && <Pin size={13} className="text-amber-600" />}
              <span className="truncate">{a.title}</span>
            </div>
            {a.message && <p className="mt-1 text-sm text-zinc-700 whitespace-pre-wrap">{a.message}</p>}
            <div className="mt-2 text-xs text-zinc-500">
              {a.created_by_name} · {timeAgo(a.created_at)}
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <UrgencyPill urgency={a.urgency} />
            {canEdit && (
              <button
                className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-100"
                onClick={onEdit}
                aria-label="Edit"
              >
                <Pencil size={14} />
              </button>
            )}
            {isAdmin && (
              <button
                className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-100"
                onClick={async () => {
                  await api.post(`/api/houses/${houseId}/announcements/${a.id}/pin`);
                  onChange();
                }}
                aria-label={a.is_pinned ? "Unpin" : "Pin"}
              >
                <Pin size={14} className={a.is_pinned ? "text-amber-600 fill-amber-600" : ""} />
              </button>
            )}
            <button
              className="rounded-md p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-rose-600"
              onClick={async () => {
                if (!confirm("Delete this announcement?")) return;
                await api.del(`/api/houses/${houseId}/announcements/${a.id}`);
                onChange();
              }}
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      </div>
    </Card>
  );
}

function UrgencyPill({ urgency }) {
  if (urgency === "high") return <Pill variant="danger">high</Pill>;
  if (urgency === "low") return <Pill>low</Pill>;
  return <Pill variant="accent">normal</Pill>;
}

function NewAnnouncementModal({ open, onClose, isAdmin, houseId, onCreated }) {
  const { push } = useToast();
  const [form, setForm] = useState({ title: "", message: "", urgency: "normal", is_pinned: false });
  return (
    <Modal open={open} title="New announcement" onClose={onClose}>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          try {
            await api.post(`/api/houses/${houseId}/announcements`, form);
            push("Posted", "success");
            onCreated();
            setForm({ title: "", message: "", urgency: "normal", is_pinned: false });
          } catch (err) { push(err.message, "error"); }
        }}
        className="flex flex-col gap-3"
      >
        <Field label="Title">
          <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required placeholder="Plumber coming Tuesday" />
        </Field>
        <Field label="Message">
          <Textarea value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} rows={4} placeholder="Details for the house" />
        </Field>
        <Field label="Urgency">
          <Select value={form.urgency} onChange={(e) => setForm({ ...form, urgency: e.target.value })}>
            <option value="low">Low</option>
            <option value="normal">Normal</option>
            <option value="high">High</option>
          </Select>
        </Field>
        {isAdmin && (
          <label className="flex items-center gap-2 text-sm text-zinc-700">
            <input
              type="checkbox"
              checked={form.is_pinned}
              onChange={(e) => setForm({ ...form, is_pinned: e.target.checked })}
              className="h-4 w-4 rounded border-zinc-300 text-accent focus:ring-accent"
            />
            Pin to top
          </label>
        )}
        <Button variant="primary" className="mt-2">Post</Button>
      </form>
    </Modal>
  );
}

function EditAnnouncementModal({ ann, onClose, houseId, onSaved }) {
  const { push } = useToast();
  const [form, setForm] = useState({ title: "", message: "", urgency: "normal" });

  // Load the current values into the form whenever a new announcement is
  // opened for editing. Keeping this in an effect avoids a stale-form flash
  // when switching between rows
  useEffect(() => {
    if (ann) setForm({ title: ann.title, message: ann.message, urgency: ann.urgency });
  }, [ann?.id]);

  return (
    <Modal open={!!ann} title="Edit announcement" onClose={onClose}>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          try {
            await api.patch(`/api/houses/${houseId}/announcements/${ann.id}`, form);
            push("Updated", "success");
            onSaved();
          } catch (err) { push(err.message, "error"); }
        }}
        className="flex flex-col gap-3"
      >
        <Field label="Title">
          <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
        </Field>
        <Field label="Message">
          <Textarea value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} rows={4} />
        </Field>
        <Field label="Urgency">
          <Select value={form.urgency} onChange={(e) => setForm({ ...form, urgency: e.target.value })}>
            <option value="low">Low</option>
            <option value="normal">Normal</option>
            <option value="high">High</option>
          </Select>
        </Field>
        <Button variant="primary" className="mt-2">Save changes</Button>
      </form>
    </Modal>
  );
}
