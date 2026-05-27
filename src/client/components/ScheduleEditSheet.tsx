import type { FeatureDTO, ScheduleDTO, ScheduleLocationDTO } from "@/shared/types";
import { useEffect, useMemo, useState } from "react";
import { useCreateFeature, useCreateSchedule, useDeleteSchedule, useSchedule, useUpdateSchedule } from "../api/hooks/useApi";
import { FeatureCatalogSheet } from "./FeatureCatalogSheet";
import { FeatureSettingsSheet } from "./FeatureSettingsSheet";
import { LocationPickerSheet } from "./LocationPickerSheet";
import { MapSection } from "./MapSection";
import { Button, TextArea, TextInput } from "./Section";
import { Sheet } from "./Sheet";

function localValue(date: Date | string) {
  const value = typeof date === "string" ? new Date(date) : date;
  return new Date(value.getTime() - value.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

function initialEnd() {
  return localValue(new Date(Date.now() + 90 * 60 * 1000));
}

const initialChecklist = () => ({ kind: "checklist" as const, items: [{ id: `item-${Date.now().toString(36)}`, label: "持ち物", required: true }] });

export function ScheduleEditSheet({
  eventId,
  schedule,
  mode = "create",
  onClose,
}: {
  eventId: string;
  schedule?: ScheduleDTO | null;
  mode?: "create" | "edit" | "readonly";
  onClose: () => void;
}) {
  const scheduleQuery = useSchedule(schedule?.id);
  const full = scheduleQuery.data?.schedule;
  const source = full ?? schedule ?? null;
  const [name, setName] = useState(source?.name ?? "東京駅集合");
  const [startAt, setStartAt] = useState(localValue(source?.startAt ?? new Date(Date.now() + 60 * 60 * 1000)));
  const [endAt, setEndAt] = useState(source?.endAt ? localValue(source.endAt) : initialEnd());
  const [location, setLocation] = useState<ScheduleLocationDTO | null>(source?.location ?? null);
  const [memo, setMemo] = useState(source?.memo ?? "");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [selectedFeature, setSelectedFeature] = useState<FeatureDTO | null>(null);
  const [error, setError] = useState("");
  const createSchedule = useCreateSchedule(eventId);
  const updateSchedule = useUpdateSchedule(eventId, source?.id ?? "");
  const deleteSchedule = useDeleteSchedule(eventId, source?.id ?? "");
  const createFeature = useCreateFeature(eventId, source?.id ?? "");
  const features = full?.features ?? [];
  const readonly = mode === "readonly";

  useEffect(() => {
    if (!source) return;
    setName(source.name);
    setStartAt(localValue(source.startAt));
    setEndAt(localValue(source.endAt));
    setLocation(source.location);
    setMemo(source.memo ?? "");
  }, [source?.id]);

  const dirty = useMemo(() => {
    if (mode === "create") return name !== "東京駅集合" || Boolean(location) || memo !== "";
    if (!source) return false;
    return name !== source.name || startAt !== localValue(source.startAt) || endAt !== localValue(source.endAt) || JSON.stringify(location) !== JSON.stringify(source.location) || memo !== (source.memo ?? "");
  }, [endAt, location, memo, mode, name, source, startAt]);

  const save = () => {
    setError("");
    if (new Date(endAt).getTime() <= new Date(startAt).getTime()) {
      setError("終了時刻は開始時刻より後にしてください");
      return;
    }
    const body = { name, startAt: new Date(startAt).toISOString(), endAt: new Date(endAt).toISOString(), location, memo, members: null };
    if (mode === "create") createSchedule.mutate(body, { onSuccess: onClose });
    else updateSchedule.mutate(body, { onSuccess: onClose });
  };

  const addFeature = (kind: "meetup" | "checklist") => {
    if (!source) return;
    const config = kind === "meetup" ? { kind: "meetup" as const, location: { inherit: true as const }, checkInEnabled: true } : initialChecklist();
    createFeature.mutate(
      { kind, config },
      {
        onSuccess: (data) => {
          setCatalogOpen(false);
          setSelectedFeature(data.feature);
        },
      },
    );
  };

  return (
    <>
      <Sheet
        open
        onDismiss={onClose}
        title={readonly ? "スケジュール詳細" : mode === "create" ? "スケジュール作成" : "スケジュール編集"}
        rightAction={readonly ? undefined : { label: "保存", onClick: save, disabled: createSchedule.isPending || updateSchedule.isPending }}
        dismissConfirm={() => !dirty || window.confirm("破棄しますか?")}
      >
        <div className="space-y-5">
          <label className="block space-y-2">
            <span className="text-sm font-bold text-ink-500">タイトル</span>
            <TextInput value={name} disabled={readonly} onChange={(e) => setName(e.target.value)} />
          </label>
          <section className="space-y-3">
            <h3 className="text-sm font-bold text-ink-500">時刻</h3>
            <label className="block space-y-2">
              <span className="text-sm text-ink-500">開始</span>
              <TextInput type="datetime-local" value={startAt} disabled={readonly} onChange={(e) => setStartAt(e.target.value)} />
            </label>
            <label className="block space-y-2">
              <span className="text-sm text-ink-500">終了</span>
              <TextInput type="datetime-local" value={endAt} disabled={readonly} onChange={(e) => setEndAt(e.target.value)} />
            </label>
          </section>
          <section className="space-y-2">
            <h3 className="text-sm font-bold text-ink-500">場所</h3>
            <button disabled={readonly} className="w-full rounded-2xl border border-border bg-surface p-3 text-left transition-colors active:bg-brand-100 disabled:opacity-100" onClick={() => setPickerOpen(true)}>
              {location ? <><MapSection value={location} height={170} /><span className="mt-2 block text-sm">📍 {location.label}</span></> : <span className="block min-h-[60px] content-center text-ink-500">場所未設定 (タップで設定)</span>}
            </button>
          </section>
          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-ink-500">機能</h3>
              {!readonly && source && <button className="min-h-11 min-w-11 rounded-full bg-brand-100 text-xl font-bold text-brand-500" onClick={() => setCatalogOpen(true)}>+</button>}
            </div>
            {features.length === 0 && <p className="rounded-2xl border border-dashed border-border p-4 text-sm text-ink-500">+ で機能を追加</p>}
            {features.map((feature) => (
              <button key={feature.id} className="flex min-h-[60px] w-full items-center gap-3 rounded-2xl border border-border bg-surface px-4 text-left transition-colors active:bg-brand-100" onClick={() => setSelectedFeature(feature)}>
                <span>{feature.kind === "meetup" ? "📍" : "☑"}</span>
                <span className="min-w-0 flex-1">
                  <span className="block font-bold">{feature.kind === "meetup" ? "集合" : "持ち物確認"}</span>
                  <span className="block truncate text-sm text-ink-500">{feature.aggregate?.doneCount ?? 0}/{feature.aggregate?.totalMembers ?? 0} 人</span>
                </span>
                <span className="text-ink-500">›</span>
              </button>
            ))}
          </section>
          <label className="block space-y-2">
            <span className="text-sm font-bold text-ink-500">メモ</span>
            <TextArea rows={4} value={memo} disabled={readonly} onChange={(e) => setMemo(e.target.value)} />
          </label>
          {error && <p className="text-sm text-warning">{error}</p>}
          {mode === "edit" && source && (
            <Button className="w-full" variant="ghost" onClick={() => { if (window.confirm("削除しますか?")) deleteSchedule.mutate(undefined, { onSuccess: onClose }); }}>
              削除
            </Button>
          )}
        </div>
      </Sheet>
      <LocationPickerSheet open={pickerOpen} initial={location} onResolve={(next) => { setLocation(next); setPickerOpen(false); }} onDismiss={() => setPickerOpen(false)} />
      {source && <FeatureCatalogSheet open={catalogOpen} existing={source.featureSummaries} onSelect={addFeature} onDismiss={() => setCatalogOpen(false)} />}
      {source && selectedFeature && <FeatureSettingsSheet open eventId={eventId} schedule={source} feature={selectedFeature} mode={readonly ? "runtime" : "config"} onDismiss={() => setSelectedFeature(null)} viewerIsHost={!readonly} />}
    </>
  );
}
