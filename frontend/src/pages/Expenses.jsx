// expenses page. shows balances at the top + the full ledger below.
// "settle" button only shows up for people you actually owe money to.
import { useEffect, useState } from "react";
import { Plus, Receipt, Trash2, Wallet, ArrowDownUp } from "lucide-react";
import { api } from "../lib/api.js";
import { useToast } from "../lib/toast.jsx";
import {
  Button, Card, CardHeader, CardBody, EmptyState, Modal, Field, Input, Select,
} from "../components/ui.jsx";
import PageHeader from "../components/PageHeader.jsx";
import { money, timeAgo } from "../lib/format.js";

export default function Expenses({ ctx, user }) {
  const { house, members } = ctx;
  const { push } = useToast();
  const [expenses, setExpenses] = useState([]);
  const [balances, setBalances] = useState([]);
  const [open, setOpen] = useState(false);
  const [settleTo, setSettleTo] = useState(null);

  async function load() {
    const hid = house.id;
    const [e, b] = await Promise.all([
      api.get(`/api/houses/${hid}/expenses`),
      api.get(`/api/houses/${hid}/expenses/balances`),
    ]);
    setExpenses(e); setBalances(b);
  }
  useEffect(() => { load(); }, [house.id]);

  const myBal = balances.find((b) => b.user_id === user.id);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="House · Money"
        title="Expenses"
        description="Split rent, utilities, takeout. Settle when you want."
        action={
          <Button variant="primary" onClick={() => setOpen(true)}>
            <Plus size={14} /> New expense
          </Button>
        }
      />

      <Card>
        <CardHeader title="Balances" icon={Wallet} />
        <CardBody className="pt-0">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {balances.map((b) => {
              const tone =
                b.net > 0.01 ? "text-emerald-600"
                : b.net < -0.01 ? "text-rose-600"
                : "text-zinc-500";
              const note =
                b.net > 0.01 ? "is owed"
                : b.net < -0.01 ? "owes the house"
                : "settled up";
              return (
                <div key={b.user_id} className="group rounded-xl border border-zinc-200 bg-gradient-to-b from-white to-zinc-50 p-4 transition-all hover:-translate-y-px hover:shadow-card hover:border-zinc-300">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[13px] font-medium text-zinc-700 truncate">
                      {b.user_name}{b.user_id === user.id ? " (you)" : ""}
                    </span>
                  </div>
                  <div className={"mt-1 text-[22px] font-semibold tracking-tight tnum " + tone}>
                    {money(b.net)}
                  </div>
                  <div className="text-[11px] text-zinc-500">{note}</div>
                  {b.user_id !== user.id && b.net > 0.01 && myBal && myBal.net < 0 && (
                    <Button
                      size="sm"
                      className="mt-2 w-full"
                      onClick={() => setSettleTo(b)}
                    >
                      <ArrowDownUp size={12} /> Settle
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="All expenses" icon={Receipt} />
        <CardBody className="pt-0 px-0">
          {expenses.length === 0 ? (
            <EmptyState icon={Receipt} title="No expenses yet" hint="Click 'New expense' to add the first one." />
          ) : (
            <ul className="divide-y divide-zinc-100">
              {expenses.map((e) => (
                <li key={e.id} className="px-5 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-zinc-900 truncate">{e.title}</span>
                        <span className="rounded-md bg-zinc-100 px-1.5 py-0.5 text-[11px] font-medium text-zinc-600">
                          {e.category}
                        </span>
                      </div>
                      <div className="text-xs text-zinc-500 mt-0.5">
                        Paid by {e.paid_by_name} · {timeAgo(e.created_at)}
                      </div>
                      <div className="text-xs text-zinc-500 mt-1.5">
                        {e.splits.map((s, i) => (
                          <span key={s.user_id}>
                            {i > 0 && " · "}
                            {s.user_name}: {money(s.amount_owed)}
                            {s.is_settled && <span className="text-emerald-600"> ✓</span>}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="font-semibold text-zinc-900">{money(e.amount)}</span>
                      <button
                        className="rounded-md p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-rose-600"
                        onClick={async () => {
                          if (!confirm("Delete this expense?")) return;
                          await api.del(`/api/houses/${house.id}/expenses/${e.id}`);
                          load();
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>

      <NewExpenseModal
        open={open}
        onClose={() => setOpen(false)}
        members={members}
        houseId={house.id}
        onCreated={() => { setOpen(false); load(); }}
      />

      <SettleModal
        target={settleTo}
        onClose={() => setSettleTo(null)}
        houseId={house.id}
        onDone={() => { setSettleTo(null); load(); }}
      />
    </div>
  );
}

// modal for adding a new expense. supports equal split or custom amounts per person.
function NewExpenseModal({ open, onClose, members, houseId, onCreated }) {
  const { push } = useToast();
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("general");
  const [mode, setMode] = useState("equal");
  // when in custom mode: maps userId -> what they should pay (as a string from the input)
  const [custom, setCustom] = useState({});

  const total = Number(amount) || 0;
  const equalShare = members.length ? (total / members.length) : 0;

  return (
    <Modal open={open} title="New expense" onClose={onClose}>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          try {
            const body = { title, category, amount: total, splits: [] };
            if (mode === "custom") {
              body.splits = members
                .map((m) => ({ user_id: m.id, amount_owed: Number(custom[m.id] || 0) }))
                .filter((s) => s.amount_owed > 0);
            }
            await api.post(`/api/houses/${houseId}/expenses`, body);
            push("Expense added", "success");
            onCreated();
            setTitle(""); setAmount(""); setCategory("general"); setMode("equal"); setCustom({});
          } catch (err) { push(err.message, "error"); }
        }}
        className="flex flex-col gap-3"
      >
        <Field label="Title">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Rent · March" required />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Amount">
            <Input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required />
          </Field>
          <Field label="Category">
            <Select value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="rent">Rent</option>
              <option value="utilities">Utilities</option>
              <option value="groceries">Groceries</option>
              <option value="household">Household</option>
              <option value="general">General</option>
            </Select>
          </Field>
        </div>

        <div>
          <div className="text-[13px] font-medium text-zinc-700 mb-1.5">Split</div>
          <div className="inline-flex rounded-md bg-zinc-100 p-0.5">
            {[["equal","Equally"], ["custom","Custom"]].map(([k, label]) => (
              <button
                key={k}
                type="button"
                onClick={() => setMode(k)}
                className={
                  "px-3 py-1 text-[13px] font-medium rounded " +
                  (mode === k ? "bg-white shadow-card text-zinc-900" : "text-zinc-500")
                }
              >
                {label}
              </button>
            ))}
          </div>
          {mode === "equal" ? (
            <p className="mt-2 text-xs text-zinc-500">
              Split equally between {members.length} roommates ({money(equalShare)} each)
            </p>
          ) : (
            <div className="mt-2 grid gap-2">
              {members.map((m) => (
                <div key={m.id} className="flex items-center justify-between gap-3">
                  <span className="text-sm text-zinc-700">{m.name}</span>
                  <Input
                    type="number" step="0.01" placeholder="0"
                    value={custom[m.id] || ""}
                    onChange={(e) => setCustom({ ...custom, [m.id]: e.target.value })}
                    className="w-28"
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        <Button variant="primary" className="mt-2">Add expense</Button>
      </form>
    </Modal>
  );
}

function SettleModal({ target, onClose, houseId, onDone }) {
  const { push } = useToast();
  const [amount, setAmount] = useState("");
  if (!target) return null;
  return (
    <Modal open={!!target} title={`Settle with ${target.user_name}`} onClose={onClose}>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          try {
            await api.post(`/api/houses/${houseId}/expenses/settle`, {
              to_user: target.user_id, amount: Number(amount),
            });
            push("Settled", "success");
            onDone();
            setAmount("");
          } catch (err) { push(err.message, "error"); }
        }}
        className="flex flex-col gap-3"
      >
        <p className="text-sm text-zinc-600">
          Record a payment to <span className="font-medium text-zinc-900">{target.user_name}</span>.
        </p>
        <Field label="Amount">
          <Input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required />
        </Field>
        <Button variant="primary" className="mt-2">Confirm</Button>
      </form>
    </Modal>
  );
}
