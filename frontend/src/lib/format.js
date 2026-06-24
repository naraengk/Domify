// formatting helpers used all over the place

// 12.5 -> "$12.50", -3 -> "-$3.00"
export function money(n) {
  const v = Number(n) || 0;
  return (v < 0 ? "-" : "") + "$" + Math.abs(v).toFixed(2);
}

// turn an iso timestamp into "5m ago" / "2h ago" / a date for older stuff
export function timeAgo(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return Math.floor(diff / 60) + "m ago";
  if (diff < 86400) return Math.floor(diff / 3600) + "h ago";
  if (diff < 604800) return Math.floor(diff / 86400) + "d ago";
  return d.toLocaleDateString();
}
