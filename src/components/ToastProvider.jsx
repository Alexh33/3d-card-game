import { createContext, useContext, useMemo, useState } from "react";

const ToastContext = createContext(null);
const TOAST_DURATION = 3500;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = (message, type = "info") => {
    const id = crypto.randomUUID?.() || Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, TOAST_DURATION);
  };

  const value = useMemo(() => ({ addToast }), []);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed bottom-4 right-4 flex flex-col gap-2 z-50 max-w-sm">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="backdrop-blur-lg border rounded-xl px-4 py-3 shadow-lg text-sm text-white"
            style={{
              background: toast.type === "error" ? "rgba(239,68,68,0.2)" : "rgba(0,0,0,0.55)",
              borderColor: toast.type === "error" ? "rgba(248,113,113,0.5)" : "rgba(255,255,255,0.1)",
            }}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return ctx.addToast;
}
