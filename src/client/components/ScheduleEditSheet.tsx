import type { ScheduleLocationDTO } from "@/shared/types";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "../api/client";
import { useCreateSchedule } from "../api/hooks/useApi";
import { QK } from "../api/queryKeys";
import { MapSection } from "./MapSection";
import { Button, TextArea, TextInput } from "./Section";

function localValue(date: Date) {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

export function ScheduleEditSheet({ eventId, onClose }: { eventId: string; onClose: () => void }) {
  const [name, setName] = useState("東京駅集合");
  const [startAt, setStartAt] = useState(localValue(new Date(Date.now() + 60 * 60 * 1000)));
  const [endAt, setEndAt] = useState(localValue(new Date(Date.now() + 90 * 60 * 1000)));
  const [location, setLocation] = useState<ScheduleLocationDTO>({ lat: 35.681236, lng: 139.767125, label: "東京駅" });
  const [memo, setMemo] = useState("");
  const [meetup, setMeetup] = useState(false);
  const [checklist, setChecklist] = useState(false);
  const createSchedule = useCreateSchedule(eventId);
  const queryClient = useQueryClient();
  return (
    <div className="fixed inset-0 z-[1100] flex items-end justify-center bg-black/30">
      <div className="max-h-[80dvh] w-full max-w-[375px] overflow-y-auto rounded-t-3xl bg-surface p-5 shadow-md">
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-border" />
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-bold">スケジュール編集</h2>
          <Button
            disabled={createSchedule.isPending}
            onClick={async () => {
              const result = await createSchedule.mutateAsync({
                name,
                startAt: new Date(startAt).toISOString(),
                endAt: new Date(endAt).toISOString(),
                location,
                memo,
                members: null,
              });
              if (meetup) {
                await api(`/api/schedules/${result.schedule.id}/features`, {
                  method: "POST",
                  body: JSON.stringify({ kind: "meetup", config: { kind: "meetup", location: { inherit: true }, checkInEnabled: true } }),
                });
              }
              if (checklist) {
                await api(`/api/schedules/${result.schedule.id}/features`, {
                  method: "POST",
                  body: JSON.stringify({ kind: "checklist", config: { kind: "checklist", items: [{ id: "item-1", label: "持ち物", required: true }] } }),
                });
              }
              queryClient.invalidateQueries({ queryKey: QK.schedule(result.schedule.id) });
              queryClient.invalidateQueries({ queryKey: QK.progress(eventId) });
              onClose();
            }}
          >
            保存
          </Button>
        </div>
        <div className="space-y-4">
          <TextInput value={name} onChange={(e) => setName(e.target.value)} />
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
            <TextInput type="datetime-local" value={startAt} onChange={(e) => setStartAt(e.target.value)} />
            <span className="font-bold">~</span>
            <TextInput type="datetime-local" value={endAt} onChange={(e) => setEndAt(e.target.value)} />
          </div>
          <MapSection value={location} onChange={setLocation} height={160} />
          <TextInput value={location.label} onChange={(e) => setLocation({ ...location, label: e.target.value })} />
          <div className="space-y-2">
            <p className="text-sm font-bold text-ink-500">機能を追加</p>
            <label className="flex items-center justify-between rounded-2xl border border-border px-4 py-3">
              集合 <input type="checkbox" checked={meetup} onChange={(e) => setMeetup(e.target.checked)} />
            </label>
            <label className="flex items-center justify-between rounded-2xl border border-border px-4 py-3">
              持ち物確認 <input type="checkbox" checked={checklist} onChange={(e) => setChecklist(e.target.checked)} />
            </label>
          </div>
          <div className="text-sm font-bold text-ink-500">参加メンバー <span className="float-right rounded-full border border-border px-4 py-1 text-ink-900">全員</span></div>
          <TextArea rows={4} value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="概要・メモ入力" />
          <Button className="w-full" variant="ghost" onClick={onClose}>閉じる</Button>
        </div>
      </div>
    </div>
  );
}
