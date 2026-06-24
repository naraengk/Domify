// roommates page. lists everyone, lets admins boot people, lets anyone leave.
import { useEffect, useState } from "react";
import { Users, Copy, ShieldCheck, UserMinus, LogOut } from "lucide-react";
import { api } from "../lib/api.js";
import { useToast } from "../lib/toast.jsx";
import {
  Button, Card, CardHeader, CardBody, Pill,
} from "../components/ui.jsx";
import PageHeader from "../components/PageHeader.jsx";
import { timeAgo } from "../lib/format.js";

export default function HouseMembers({ ctx, user, onLeave }) {
  const { house } = ctx;
  const { push } = useToast();
  const [members, setMembers] = useState([]);
  const isAdmin = house.role === "admin";

  async function load() {
    setMembers(await api.get(`/api/houses/${house.id}/members`));
  }
  useEffect(() => { load(); }, [house.id]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="House · People"
        title="Roommates"
        description={`${house.name}${house.address ? " · " + house.address : ""}`}
      />

      <Card>
        <CardHeader
          title="Members"
          icon={Users}
          action={
            <button
              onClick={() => {
                navigator.clipboard.writeText(house.invite_code);
                push("Invite code copied", "success");
              }}
              className="inline-flex items-center gap-1.5 rounded-md border border-zinc-200 bg-zinc-50 px-2.5 py-1 font-mono text-[12px] text-zinc-700 hover:bg-zinc-100"
            >
              {house.invite_code}
              <Copy size={12} className="text-zinc-400" />
            </button>
          }
        />
        <CardBody className="pt-0 px-0">
          <ul className="divide-y divide-zinc-100">
            {members.map((m) => (
              <li key={m.id} className="flex items-center justify-between gap-3 px-5 py-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-accent-500 to-accent-700 text-[13px] font-semibold text-white shadow-innerTop">
                    {m.name[0]?.toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-zinc-900 truncate">
                      {m.name}{m.id === user.id ? " (you)" : ""}
                    </div>
                    <div className="text-xs text-zinc-500 truncate">
                      {m.email} · joined {timeAgo(m.joined_at)}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {m.role === "admin" ? (
                    <Pill variant="accent">
                      <ShieldCheck size={11} /> admin
                    </Pill>
                  ) : (
                    <Pill>member</Pill>
                  )}
                  {isAdmin && m.id !== user.id && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={async () => {
                        if (!confirm(`Remove ${m.name} from the house?`)) return;
                        await api.del(`/api/houses/${house.id}/members/${m.id}`);
                        load();
                      }}
                    >
                      <UserMinus size={13} /> Remove
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </CardBody>
      </Card>

      <Card className="border-rose-200">
        <CardHeader
          title="Leave this house"
          icon={LogOut}
          description="You can rejoin later with the invite code."
        />
        <CardBody className="pt-0">
          <Button
            variant="danger"
            onClick={async () => {
              if (!confirm("Leave this house?")) return;
              await api.del(`/api/houses/${house.id}/leave`);
              push("You left the house");
              onLeave();
            }}
          >
            <LogOut size={14} /> Leave house
          </Button>
        </CardBody>
      </Card>
    </div>
  );
}
