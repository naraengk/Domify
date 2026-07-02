// conflict log
// helpful if the landlord ever asks for a record
import { useEffect, useState } from "react";
import { Scale, Plus, Trash2 } from "lucide-react";
import { api } from "../lib/api.js";
import { useToast } from "../lib/toast.jsx";
import {
  Button, Card, CardBody, EmptyState, Modal, Field, Input, Textarea, LoadingCard,
} from "../components/ui.jsx";
import PageHeader from "../components/PageHeader.jsx";
import { timeAgo } from "../lib/format.js";

export default function Conflicts({ ctx }) {
  const { house } = ctx;
  const { push } = useToast();
  const [items, setItems] = useState(null);
  const [open, setOpen] = useState(false);

  async function load() {
    setItems(await api.get(`/api/houses/${house.id}/conflicts`));
  }
  useEffect(() => { load(); }, [house.id]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="House · Records"
        title="Conflict log"
        description="Keep a paper trail. Stick to facts and dates."
        action={
          <Button variant="primary" onClick={() => setOpen(true)}>
            <Plus size={14} /> Log issue
          </Button>
        }
      />

      {items === null ? (
        <LoadingCard />
      ) : items.length === 0 ? (
        <Card><CardBody><EmptyState icon={Scale} title="Nothing logged" hint="Keep it that way." /></CardBody></Card>
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((c) => (
            <Card key={c.id}>
              <CardBody className="py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-zinc-900">{c.title}</div>
                    {c.description && <p className="mt-1 text-sm text-zinc-700 whitespace-pre-wrap">{c.description}</p>}
                    <div className="mt-2 text-xs text-zinc-500">
                      Logged by {c.logged_by_name} · {timeAgo(c.occurred_at)}
                    </div>
                  </div>
                  <button
                    className="rounded-md p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-rose-600"
                    onClick={async () => {
                      if (!confirm("Delete this log entry?")) return;
                      await api.del(`/api/houses/${house.id}/conflicts/${c.id}`);
                      load();
                    }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      <Modal open={open} title="Log an issue" onClose={() => setOpen(false)}>
        <NewConflictForm
          houseId={house.id}
          onCreated={() => { setOpen(false); load(); }}
        />
      </Modal>
    </div>
  );
}

function NewConflictForm({ houseId, onCreated }) {
  const { push } = useToast();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        try {
          await api.post(`/api/houses/${houseId}/conflicts`, { title, description });
          push("Logged", "success");
          onCreated();
          setTitle(""); setDescription("");
        } catch (err) { push(err.message, "error"); }
      }}
      className="flex flex-col gap-3"
    >
      <p className="text-xs text-zinc-500">Keep it factual: what, when, who was involved.</p>
      <Field label="Title">
        <Input value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="Heater stopped working" />
      </Field>
      <Field label="Details">
        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} />
      </Field>
      <Button variant="primary" className="mt-2">Log entry</Button>
    </form>
  );
}
