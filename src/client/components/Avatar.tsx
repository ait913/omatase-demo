export function Avatar({ name }: { name: string }) {
  return (
    <span className="grid size-9 shrink-0 place-items-center rounded-full border border-border bg-brand-100 text-sm font-bold text-brand-500">
      {name.trim().slice(0, 1) || "?"}
    </span>
  );
}
