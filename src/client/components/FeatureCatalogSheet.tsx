import type { FeatureSummaryDTO } from "@/shared/types";
import { Sheet } from "./Sheet";

const catalog = [
  { kind: "meetup" as const, icon: "📍", title: "集合", description: "集合場所と出欠を管理" },
  { kind: "checklist" as const, icon: "☑", title: "持ち物確認", description: "全員のチェックリスト" },
];

export function FeatureCatalogSheet({
  open,
  existing = [],
  onSelect,
  onDismiss,
}: {
  open: boolean;
  existing?: FeatureSummaryDTO[];
  onSelect: (kind: "meetup" | "checklist") => void;
  onDismiss: () => void;
}) {
  return (
    <Sheet open={open} onDismiss={onDismiss} title="機能を追加" stackLevel={2}>
      <div className="space-y-2">
        {catalog.map((item) => {
          const already = existing.some((feature) => feature.kind === item.kind);
          return (
            <button
              key={item.kind}
              disabled={already}
              className="flex min-h-20 w-full items-center gap-3 rounded-2xl border border-border bg-surface px-4 text-left transition-colors active:bg-brand-100 disabled:opacity-50"
              onClick={() => onSelect(item.kind)}
            >
              <span className="text-2xl">{item.icon}</span>
              <span className="min-w-0 flex-1">
                <span className="block font-bold">{item.title}</span>
                <span className="block truncate text-sm text-ink-500">{item.description}</span>
              </span>
              {already && <span className="rounded-full bg-brand-100 px-3 py-1 text-xs font-bold text-brand-500">追加済</span>}
            </button>
          );
        })}
      </div>
    </Sheet>
  );
}
