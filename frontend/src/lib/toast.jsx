// toast notifications. wrap the app in <ToastProvider> and call useToast().push("...")
import { createContext, useContext, useState, useCallback } from "react";
import { CheckCircle2, AlertCircle, Info } from "lucide-react";

const ToastCtx = createContext({ push: () => {} });

export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);

  // add a toast, then remove it after a couple seconds
  const push = useCallback((message, type = "info") => {
    const id = Math.random().toString(36).slice(2);
    setItems((s) => [...s, { id, message, type }]);
    setTimeout(() => setItems((s) => s.filter((x) => x.id !== id)), 2600);
  }, []);

  return (
    <ToastCtx.Provider value={{ push }}>
      {children}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2">
        {items.map((t) => (
          <div
            key={t.id}
            className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white/95 px-3.5 py-2.5 text-sm text-zinc-800 shadow-pop backdrop-blur animate-pop-in"
          >
            {t.type === "success" && <CheckCircle2 size={16} className="text-emerald-600" />}
            {t.type === "error" && <AlertCircle size={16} className="text-rose-600" />}
            {t.type === "info" && <Info size={16} className="text-accent" />}
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export function useToast() {
  return useContext(ToastCtx);
}
