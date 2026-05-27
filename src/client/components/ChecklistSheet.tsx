import type { FeatureDTO, ScheduleDTO } from "@/shared/types";
import { useState } from "react";
import { useDeleteFeature, useUpdateFeature, useUpdateFeatureState } from "../api/hooks/useApi";
import { Button, TextInput } from "./Section";
import { Sheet } from "./Sheet";

function makeItemId() {
  return `item-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function ChecklistSheet({
  open,
  eventId,
  schedule,
  feature,
  mode,
  onDismiss,
  viewerIsHost = false,
  stackLevel = 2,
}: {
  open: boolean;
  eventId: string;
  schedule: ScheduleDTO;
  feature: FeatureDTO;
  mode: "config" | "runtime";
  onDismiss: () => void;
  viewerIsHost?: boolean;
  stackLevel?: 1 | 2;
}) {
  const config = feature.config.kind === "checklist" ? feature.config : { kind: "checklist" as const, items: [] };
  const [items, setItems] = useState(config.items);
  const [newLabel, setNewLabel] = useState("");
  const update = useUpdateFeature(eventId, schedule.id, feature.id);
  const remove = useDeleteFeature(eventId, schedule.id, feature.id);
  const updateState = useUpdateFeatureState(eventId, feature.id);

  const persist = (next = items) => update.mutate({ config: { kind: "checklist", items: next } });

  if (mode === "config") {
    return (
      <Sheet open={open} onDismiss={onDismiss} title="持ち物確認の設定" stackLevel={stackLevel} rightAction={{ label: "保存", onClick: () => persist(), disabled: items.length === 0 || update.isPending }}>
        <div className="space-y-5">
          <section className="space-y-2">
            <h3 className="text-sm font-bold text-ink-500">チェックリスト</h3>
            {items.map((item, index) => (
              <div key={item.id} className="flex min-h-14 items-center gap-2 rounded-2xl border border-border bg-surface px-3">
                <TextInput
                  value={item.label}
                  onChange={(e) => setItems((value) => value.map((candidate) => (candidate.id === item.id ? { ...candidate, label: e.target.value } : candidate)))}
                  onBlur={() => persist(items)}
                />
                <button
                  aria-label="削除"
                  className="min-h-11 min-w-11 rounded-full text-xl"
                  onClick={() => {
                    const next = items.filter((_, i) => i !== index);
                    setItems(next);
                    if (next.length > 0) persist(next);
                  }}
                >
                  ×
                </button>
              </div>
            ))}
            <div className="rounded-2xl border border-dashed border-border p-3">
              <p className="mb-2 text-sm font-bold text-ink-500">＋ 新しいアイテム</p>
              <div className="flex gap-2">
                <TextInput value={newLabel} onChange={(e) => setNewLabel(e.target.value)} onKeyDown={(e) => {
                  if (e.key !== "Enter" || !newLabel.trim()) return;
                  const next = [...items, { id: makeItemId(), label: newLabel.trim(), required: true }];
                  setItems(next);
                  setNewLabel("");
                  persist(next);
                }} />
                <Button
                  disabled={!newLabel.trim()}
                  onClick={() => {
                    const next = [...items, { id: makeItemId(), label: newLabel.trim(), required: true }];
                    setItems(next);
                    setNewLabel("");
                    persist(next);
                  }}
                >
                  追加
                </Button>
              </div>
            </div>
          </section>
          <Button className="w-full" variant="ghost" onClick={() => { if (window.confirm("このスケジュールから削除しますか?")) remove.mutate(undefined, { onSuccess: onDismiss }); }}>
            このスケジュールから削除
          </Button>
        </div>
      </Sheet>
    );
  }

  const checked = (feature.state as { checked?: Record<string, boolean> }).checked ?? {};
  const required = config.items.filter((item) => item.required);
  const allMineDone = required.length > 0 && required.every((item) => checked[item.id]);
  return (
    <Sheet open={open} onDismiss={onDismiss} title="持ち物確認" stackLevel={stackLevel}>
      <div className="space-y-5">
        <section className="space-y-2">
          <h3 className="text-sm font-bold text-ink-500">あなたのチェック</h3>
          {config.items.map((item) => (
            <button
              key={item.id}
              className="flex min-h-14 w-full items-center gap-3 rounded-2xl border border-border bg-surface px-4 text-left transition-colors active:bg-brand-100"
              onClick={() => updateState.mutate({ kind: "checklist", checked: { ...checked, [item.id]: !checked[item.id] } })}
            >
              <span>{checked[item.id] ? "☑" : "☐"}</span>
              <span>{item.label}</span>
            </button>
          ))}
          {allMineDone && <p className="text-sm text-success">あなたは全て完了です ✓</p>}
        </section>
        <section className="space-y-2 text-sm">
          <h3 className="font-bold text-ink-500">全員の進捗</h3>
          <p>{feature.aggregate?.doneCount ?? 0} / {feature.aggregate?.totalMembers ?? 0} 人が完了</p>
          {viewerIsHost && config.items.map((item) => <p key={item.id}>{item.label} {feature.aggregate?.perItem?.[item.id] ?? 0}/{feature.aggregate?.totalMembers ?? 0}</p>)}
        </section>
      </div>
    </Sheet>
  );
}
