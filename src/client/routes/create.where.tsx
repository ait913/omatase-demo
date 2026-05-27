import type { ScheduleLocationDTO } from "@/shared/types";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { useState } from "react";
import { api } from "../api/client";
import { useCreateSchedule } from "../api/hooks/useApi";
import { LocationPickerSheet } from "../components/LocationPickerSheet";
import { MapSection } from "../components/MapSection";
import { Button, TextInput } from "../components/Section";

function localValue(date: Date) {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

export function CreateWhereRoute() {
  const search = useSearch({ strict: false }) as { eventId?: string };
  const eventId = search.eventId ?? "";
  const [location, setLocation] = useState<ScheduleLocationDTO | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [startAt, setStartAt] = useState(localValue(new Date(Date.now() + 60 * 60 * 1000)));
  const [endAt, setEndAt] = useState(localValue(new Date(Date.now() + 90 * 60 * 1000)));
  const createSchedule = useCreateSchedule(eventId);
  const navigate = useNavigate();
  return (
    <form
      className="space-y-5 p-6"
      onSubmit={(e) => {
        e.preventDefault();
        if (!location) return;
        createSchedule.mutate(
          { name: "集合", startAt: new Date(startAt).toISOString(), endAt: new Date(endAt).toISOString(), location },
          {
            onSuccess: async (data) => {
              await api(`/api/schedules/${data.schedule.id}/features`, {
                method: "POST",
                body: JSON.stringify({ kind: "meetup", config: { kind: "meetup", location: { inherit: true }, checkInEnabled: true } }),
              });
              navigate({ to: "/e/$eventId", params: { eventId } });
            },
          },
        );
      }}
    >
      <a href="/create" className="text-sm text-ink-500">← 戻る</a>
      <h1 className="text-2xl font-bold">集合場所と時間</h1>
      <section className="space-y-2">
        <h2 className="text-sm font-bold text-ink-500">集合場所</h2>
        <button type="button" className="w-full rounded-2xl border border-border bg-surface p-3 text-left transition-colors active:bg-brand-100" onClick={() => setPickerOpen(true)}>
          {location ? <><MapSection value={location} height={180} /><span className="mt-2 block text-sm">📍 {location.label}</span></> : <span className="block min-h-[180px] content-center text-center text-ink-500">場所未設定 (タップで設定)</span>}
        </button>
      </section>
      <section className="space-y-3">
        <h2 className="text-sm font-bold text-ink-500">集合時刻</h2>
        <label className="block space-y-2"><span className="text-sm text-ink-500">開始</span><TextInput type="datetime-local" value={startAt} onChange={(e) => setStartAt(e.target.value)} /></label>
        <label className="block space-y-2"><span className="text-sm text-ink-500">終了</span><TextInput type="datetime-local" value={endAt} onChange={(e) => setEndAt(e.target.value)} /></label>
      </section>
      <Button className="min-h-12 w-full" disabled={!eventId || !location || createSchedule.isPending}>イベントを開始</Button>
      <LocationPickerSheet open={pickerOpen} initial={location} onResolve={(next) => { setLocation(next); setPickerOpen(false); }} onDismiss={() => setPickerOpen(false)} />
    </form>
  );
}
