import { useEffect, useState } from "react";
import { ShoppingBasket, Plus, Trash2, Check, Eraser } from "lucide-react";
import { api } from "../lib/api.js";
import { useToast } from "../lib/toast.jsx";
import { Button, Card, CardHeader, CardBody, EmptyState, Input, Select, LoadingCard } from "../components/ui.jsx";
import PageHeader from "../components/PageHeader.jsx";

// grocery list
// anyone can add, anyone can check off

const CATEGORIES = ["produce", "dairy", "pantry", "frozen", "cleaning", "other"];

export default function Grocery({ ctx }) {
  const { house } = ctx;
  const { push } = useToast();
  const [items, setItems] = useState(null);
  const [form, setForm] = useState({ name: "", quantity: "", category: "other" });

  async function load() {
    setItems(await api.get(`/api/houses/${house.id}/grocery`));
  }
  useEffect(() => { load(); }, [house.id]);

  // bucket items by their category so we can render one section per group
  const byCat = {};
  (items ?? []).forEach((it) => {
    const k = it.category || "other";
    (byCat[k] = byCat[k] || []).push(it);
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="House · Supplies"
        title="Grocery list"
        description="Anyone can add or check off items. Group by category to keep the run organized."
        action={
          <Button
            variant="ghost"
            onClick={async () => {
              if (!confirm("Remove all bought items?")) return;
              await api.del(`/api/houses/${house.id}/grocery/bought/clear`);
              load();
            }}
          >
            <Eraser size={14} /> Clear bought
          </Button>
        }
      />

      <Card>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              await api.post(`/api/houses/${house.id}/grocery`, form);
              setForm({ name: "", quantity: "", category: form.category });
              load();
            } catch (err) { push(err.message, "error"); }
          }}
          className="grid gap-2 p-3 sm:grid-cols-[1fr_120px_140px_auto]"
        >
          <Input
            placeholder="What do we need?"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
          <Input
            placeholder="qty"
            value={form.quantity}
            onChange={(e) => setForm({ ...form, quantity: e.target.value })}
          />
          <Select
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
          >
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </Select>
          <Button variant="primary">
            <Plus size={14} /> Add
          </Button>
        </form>
      </Card>

      {items === null ? (
        <LoadingCard />
      ) : items.length === 0 ? (
        <Card>
          <CardBody>
            <EmptyState icon={ShoppingBasket} title="Nothing on the list" hint="Add the first item above." />
          </CardBody>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {Object.entries(byCat).map(([cat, list]) => (
            <Card key={cat}>
              <CardHeader title={cat} icon={ShoppingBasket} />
              <CardBody className="pt-0 px-0">
                <ul className="divide-y divide-zinc-100">
                  {list.map((it) => (
                    <li key={it.id} className="flex items-center gap-3 px-5 py-2.5">
                      <button
                        onClick={async () => {
                          await api.post(`/api/houses/${house.id}/grocery/${it.id}/toggle`);
                          load();
                        }}
                        className={
                          "grid h-5 w-5 place-items-center rounded-md border transition-colors shrink-0 " +
                          (it.is_bought
                            ? "border-accent-600 bg-accent-grad text-white shadow-innerTop"
                            : "border-zinc-300 hover:border-zinc-400")
                        }
                        aria-label="Toggle"
                      >
                        {it.is_bought && <Check size={12} strokeWidth={3} />}
                      </button>
                      <span className={"flex-1 text-sm " + (it.is_bought ? "line-through text-zinc-400" : "text-zinc-800")}>
                        {it.name}
                      </span>
                      {it.quantity && <span className="text-xs text-zinc-500">{it.quantity}</span>}
                      <span className="hidden sm:inline text-[11px] text-zinc-400">by {it.added_by_name}</span>
                      <button
                        className="rounded-md p-1 text-zinc-400 hover:bg-zinc-100 hover:text-rose-600"
                        onClick={async () => {
                          await api.del(`/api/houses/${house.id}/grocery/${it.id}`);
                          load();
                        }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </li>
                  ))}
                </ul>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
