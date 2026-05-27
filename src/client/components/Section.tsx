import type { ReactNode } from "react";

export function Section({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between text-sm font-bold text-ink-500">
        <h2>{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export function Button({ children, variant = "primary", ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "soft" | "ghost" }) {
  const cls =
    variant === "primary"
      ? "bg-brand-500 text-white"
      : variant === "soft"
        ? "bg-brand-100 text-brand-500"
        : "bg-transparent text-ink-900";
  return (
    <button {...props} className={`min-h-11 min-w-11 rounded-full px-4 py-2 text-sm font-bold disabled:opacity-50 ${cls} ${props.className ?? ""}`}>
      {children}
    </button>
  );
}

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`min-h-11 w-full rounded-2xl border border-border bg-surface px-4 py-3 outline-none focus:border-brand-500 ${props.className ?? ""}`} />;
}

export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`w-full resize-none rounded-2xl border border-border bg-surface px-4 py-3 outline-none focus:border-brand-500 ${props.className ?? ""}`} />;
}
