// Profile editor page, Lets the user upload an avatar and update the
// optional fields on their account, These values are user-scoped and are
// not tied to any specific house
import { useEffect, useRef, useState } from "react";
import { Camera, Save, User } from "lucide-react";
import { api } from "../lib/api.js";
import { useToast } from "../lib/toast.jsx";
import {
  Button, Card, CardBody, CardHeader, Field, Input, Select, Textarea,
} from "../components/ui.jsx";
import PageHeader from "../components/PageHeader.jsx";

// Options for the pronouns dropdown. An empty string means "not set"
const PRONOUNS = ["", "he/him", "she/her", "they/them", "he/they", "she/they", "any"];

export default function Profile({ user, onUserUpdate }) {
  const { success, error: toastError } = useToast();
  // Reference to the hidden file input, Clicking the avatar triggers it
  const fileRef = useRef(null);
  // The current profile loaded from the server
  const [profile, setProfile] = useState(null);
  // Disables the save button while a request is in flight
  const [saving, setSaving] = useState(false);
  // Local form state. The inputs are bound to this object rather than to
  // the profile directly so we can edit without mutating the source
  const [form, setForm] = useState({});

  // Load the profile from the server and populate the form with its values
  async function load() {
    const p = await api.get("/api/profile/me");
    setProfile(p);
    setForm({
      bio: p.bio || "",
      pronouns: p.pronouns || "",
      venmo_handle: p.venmo_handle || "",
      zelle_handle: p.zelle_handle || "",
      phone: p.phone || "",
      dietary_restrictions: p.dietary_restrictions || "",
      chore_preferences: p.chore_preferences || "",
      timezone: p.timezone || "America/New_York",
    });
  }

  useEffect(() => { load(); }, []);

  if (!profile) {
    return <div className="h-40 rounded-2xl bg-zinc-100 animate-pulse" />;
  }

  const avatarSrc = profile.avatar_url
    ? (profile.avatar_url.startsWith("http") ? profile.avatar_url : profile.avatar_url)
    : null;

  // Submit the form as a PATCH request. Only the fields that changed need
  // to be sent, but the backend ignores any unchanged values regardless
  async function save(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const updated = await api.patch("/api/profile/me", form);
      setProfile(updated);
      // Propagate the updated name to the parent so that the topbar avatar
      // and other places that display it stay in sync
      onUserUpdate?.({ ...user, name: updated.name });
      success("Profile saved", "✨");
    } catch (err) {
      toastError(err.message);
    } finally {
      setSaving(false);
    }
  }

  // Called when the user picks an image from the file dialog. The file is
  // wrapped in FormData and posted as multipart so FastAPI can read it as
  // an UploadFile
  async function onAvatar(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    try {
      const updated = await api.upload("/api/profile/avatar", fd);
      setProfile(updated);
      success("Avatar updated", "📸");
    } catch (err) {
      toastError(err.message);
    }
  }

  return (
    <div className="flex flex-col gap-6 pb-4">
      <PageHeader
        eyebrow="Account"
        title="Profile"
        description="Personalize how roommates see you across the house."
      />

      <Card hover>
        <CardBody className="flex flex-col sm:flex-row items-center gap-5 pt-6">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="relative group shrink-0"
          >
            {avatarSrc ? (
              <img
                src={avatarSrc}
                alt=""
                className="h-20 w-20 rounded-full object-cover ring-2 ring-white shadow-card"
              />
            ) : (
              <div className="grid h-20 w-20 place-items-center rounded-full bg-gradient-to-br from-blue-500 to-blue-800 text-2xl font-semibold text-white shadow-card">
                {profile.name[0]?.toUpperCase()}
              </div>
            )}
            <span className="absolute -bottom-1 -right-1 grid h-7 w-7 place-items-center rounded-full bg-white ring-1 ring-zinc-200 text-zinc-600 shadow-sm group-hover:text-accent-600">
              <Camera size={14} />
            </span>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onAvatar} />
          </button>
          <div className="text-center sm:text-left min-w-0">
            <div className="text-xl font-semibold tracking-tight text-zinc-900">{profile.name}</div>
            <div className="text-sm text-zinc-500">{profile.email}</div>
            {profile.pronouns && (
              <div className="mt-1 text-xs text-zinc-500">{profile.pronouns}</div>
            )}
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="About you" icon={User} />
        <CardBody className="pt-0">
          <form onSubmit={save} className="flex flex-col gap-4">
            <Field label="Bio" hint="140 characters max, shown on Roommates hover">
              <Textarea
                rows={2}
                maxLength={140}
                value={form.bio}
                onChange={(e) => setForm({ ...form, bio: e.target.value })}
                placeholder="Third-year bio major. Usually cooking pasta."
              />
            </Field>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Pronouns">
                <Select
                  value={form.pronouns}
                  onChange={(e) => setForm({ ...form, pronouns: e.target.value })}
                >
                  {PRONOUNS.map((p) => (
                    <option key={p || "none"} value={p}>{p || "Prefer not to say"}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Phone (emergencies)">
                <Input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="+1 555 0100"
                />
              </Field>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Venmo handle">
                <Input
                  value={form.venmo_handle}
                  onChange={(e) => setForm({ ...form, venmo_handle: e.target.value })}
                  placeholder="@username"
                />
              </Field>
              <Field label="Zelle (email or phone)">
                <Input
                  value={form.zelle_handle}
                  onChange={(e) => setForm({ ...form, zelle_handle: e.target.value })}
                  placeholder="you@email.com"
                />
              </Field>
            </div>
            <Field label="Dietary restrictions" hint="Shows on grocery list">
              <Input
                value={form.dietary_restrictions}
                onChange={(e) => setForm({ ...form, dietary_restrictions: e.target.value })}
                placeholder="vegan, nut allergy"
              />
            </Field>
            <Field label="Chore preferences">
              <Textarea
                rows={2}
                value={form.chore_preferences}
                onChange={(e) => setForm({ ...form, chore_preferences: e.target.value })}
                placeholder="I hate dishes, love vacuuming"
              />
            </Field>
            <Field label="Timezone" hint="Used for quiet hours">
              <Select
                value={form.timezone}
                onChange={(e) => setForm({ ...form, timezone: e.target.value })}
              >
                <option value="America/New_York">Eastern</option>
                <option value="America/Chicago">Central</option>
                <option value="America/Denver">Mountain</option>
                <option value="America/Los_Angeles">Pacific</option>
                <option value="Europe/London">London</option>
                <option value="Asia/Dubai">Dubai</option>
              </Select>
            </Field>
            <Button variant="primary" type="submit" loading={saving} loadingText="Saving…">
              <Save size={14} /> Save profile
            </Button>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
