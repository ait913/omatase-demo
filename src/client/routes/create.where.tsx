import type { ScheduleLocationDTO } from "@/shared/types";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { useState } from "react";
import { api } from "../api/client";
import { useCreateSchedule } from "../api/hooks/useApi";
import { MapSection } from "../components/MapSection";
import { Button, TextInput } from "../components/Section";

function localValue(date: Date) {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

export function CreateWhereRoute() {
  const search = useSearch({ strict: false }) as { eventId?: string };
  const eventId = search.eventId ?? "";
  const [location, setLocation] = useState<ScheduleLocationDTO>({ lat: 35.681236, lng: 139.767125, label: "東京駅 丸の内中央口" });
  const [startAt, setStartAt] = useState(localValue(new Date(Date.now() + 60 * 60 * 1000)));
  const [endAt, setEndAt] = useState(localValue(new Date(Date.now() + 90 * 60 * 1000)));
  const createSchedule = useCreateSchedule(eventId);
  const navigate = useNavigate();
  return (
    <form
      className="space-y-5 p-6"
      onSubmit={(e) => {
        e.preventDefault();
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
      <MapSection value={location} onChange={setLocation} height={240} />
      <TextInput value={location.label} onChange={(e) => setLocation({ ...location, label: e.target.value })} />
      <label className="block space-y-2"><span className="text-sm text-ink-500">集合時刻</span><TextInput type="datetime-local" value={startAt} onChange={(e) => setStartAt(e.target.value)} /></label>
      <label className="block space-y-2"><span className="text-sm text-ink-500">終了予定</span><TextInput type="datetime-local" value={endAt} onChange={(e) => setEndAt(e.target.value)} /></label>
      <Button className="w-full" disabled={!eventId || createSchedule.isPending}>イベントを開始</Button>
    </form>
  );
}
