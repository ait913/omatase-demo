import type { ScheduleDTO } from "@/shared/types";

export function ScheduleList({ schedules, onSelect }: { schedules: ScheduleDTO[]; onSelect?: (schedule: ScheduleDTO) => void }) {
  return (
    <div className="space-y-2">
      {schedules.map((schedule) => (
        <button key={schedule.id} onClick={() => onSelect?.(schedule)} className="flex w-full items-center justify-between rounded-2xl border border-border bg-surface px-4 py-3 text-left">
          <span className="font-bold">{schedule.name}</span>
          <span className="tabular-nums text-sm text-ink-500">{new Date(schedule.startAt).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })}</span>
        </button>
      ))}
    </div>
  );
}
