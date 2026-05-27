import type { FeatureDTO, ScheduleDTO, ScheduleLocationDTO } from "@/shared/types";
import { useState } from "react";
import { useDeleteFeature, useUpdateFeature, useUpdateFeatureState } from "../api/hooks/useApi";
import { MapSection } from "./MapSection";
import { Button } from "./Section";
import { Sheet } from "./Sheet";
import { LocationPickerSheet } from "./LocationPickerSheet";

function featureLocation(schedule: ScheduleDTO, feature: FeatureDTO): ScheduleLocationDTO | null {
  if (feature.config.kind !== "meetup") return schedule.location;
  if (feature.config.location.inherit) return schedule.location;
  return { lat: feature.config.location.lat, lng: feature.config.location.lng, label: feature.config.location.label };
}

export function MeetupSheet({
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
  const config = feature.config.kind === "meetup" ? feature.config : { kind: "meetup" as const, location: { inherit: true as const }, checkInEnabled: true };
  const [inherit, setInherit] = useState(config.location.inherit);
  const [customLocation, setCustomLocation] = useState<ScheduleLocationDTO | null>(config.location.inherit ? null : { lat: config.location.lat, lng: config.location.lng, label: config.location.label });
  const [checkInEnabled, setCheckInEnabled] = useState(config.checkInEnabled);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [error, setError] = useState("");
  const update = useUpdateFeature(eventId, schedule.id, feature.id);
  const remove = useDeleteFeature(eventId, schedule.id, feature.id);
  const updateState = useUpdateFeatureState(eventId, feature.id);
  const dirty = inherit !== config.location.inherit || checkInEnabled !== config.checkInEnabled || JSON.stringify(customLocation) !== JSON.stringify(config.location.inherit ? null : config.location);

  if (mode === "config") {
    const save = () => {
      if (!inherit && !customLocation) {
        setError("場所を選択してください");
        return;
      }
      update.mutate(
        {
          config: {
            kind: "meetup",
            location: inherit ? { inherit: true } : { inherit: false, lat: customLocation!.lat, lng: customLocation!.lng, label: customLocation!.label },
            checkInEnabled,
          },
        },
        { onSuccess: onDismiss },
      );
    };
    return (
      <>
        <Sheet
          open={open}
          onDismiss={onDismiss}
          title="集合の設定"
          stackLevel={stackLevel}
          rightAction={{ label: "保存", onClick: save, disabled: update.isPending }}
          dismissConfirm={() => !dirty || window.confirm("破棄しますか?")}
        >
          <div className="space-y-5">
            <section className="space-y-3">
              <h3 className="text-sm font-bold text-ink-500">集合場所</h3>
              <label className="flex min-h-11 items-center gap-3"><input type="radio" checked={inherit} onChange={() => setInherit(true)} />Schedule の場所を継承</label>
              <label className="flex min-h-11 items-center gap-3"><input type="radio" checked={!inherit} onChange={() => setInherit(false)} />別の場所を指定</label>
              {!inherit && (
                <button className="w-full rounded-2xl border border-border bg-surface p-3 text-left" onClick={() => setPickerOpen(true)}>
                  {customLocation ? <><MapSection value={customLocation} height={160} /><span className="mt-2 block text-sm">📍 {customLocation.label}</span></> : "場所を選択"}
                </button>
              )}
            </section>
            <section className="space-y-2">
              <h3 className="text-sm font-bold text-ink-500">出欠機能</h3>
              <label className="flex min-h-11 items-center justify-between rounded-2xl border border-border px-4">
                チェックイン
                <input type="checkbox" checked={checkInEnabled} onChange={(e) => setCheckInEnabled(e.target.checked)} />
              </label>
              <p className="text-sm text-ink-500">各メンバーが「到着しました」を押すと管理者画面で確認できます</p>
            </section>
            {error && <p className="text-sm text-warning">{error}</p>}
            <Button
              className="w-full"
              variant="ghost"
              onClick={() => {
                if (window.confirm("このスケジュールから削除しますか?")) remove.mutate(undefined, { onSuccess: onDismiss });
              }}
            >
              このスケジュールから削除
            </Button>
          </div>
        </Sheet>
        <LocationPickerSheet open={pickerOpen} initial={customLocation} onResolve={(next) => { setCustomLocation(next); setPickerOpen(false); }} onDismiss={() => setPickerOpen(false)} />
      </>
    );
  }

  const loc = featureLocation(schedule, feature);
  const checkedInAt = typeof feature.state.checkedInAt === "number" ? feature.state.checkedInAt : null;
  return (
    <Sheet open={open} onDismiss={onDismiss} title="集合" stackLevel={stackLevel}>
      <div className="space-y-5">
        <section className="space-y-2">
          <h3 className="text-sm font-bold text-ink-500">集合場所</h3>
          {loc ? <><MapSection value={loc} height={180} /><p className="text-sm">📍 {loc.label}</p></> : <p className="rounded-2xl border border-border p-4 text-sm text-ink-500">場所未設定</p>}
        </section>
        {config.checkInEnabled && (
          <section className="space-y-2">
            <h3 className="text-sm font-bold text-ink-500">あなたの状態</h3>
            <Button className="min-h-14 w-full" onClick={() => updateState.mutate({ kind: "meetup", checkedInAt: checkedInAt ? null : Date.now() })}>
              {checkedInAt ? "取り消し" : "到着しました"}
            </Button>
            {checkedInAt && <p className="text-sm text-success">あなたは到着済みです</p>}
          </section>
        )}
        <section className="space-y-2 text-sm">
          <h3 className="font-bold text-ink-500">集合状況</h3>
          <p>{feature.aggregate?.doneCount ?? 0} / {feature.aggregate?.totalMembers ?? 0} 人が集合済み</p>
          {viewerIsHost && <p className="text-ink-500">未到着メンバーは進行状況から確認できます</p>}
        </section>
      </div>
    </Sheet>
  );
}
