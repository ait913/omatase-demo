import type { ScheduleDTO } from "@/shared/types";

export function ScheduleList({ schedules, onSelect }: { schedules: ScheduleDTO[]; onSelect?: (schedule: ScheduleDTO) => void }) {
  return (
    <div className="space-y-2">
      {schedules.map((schedule) => (
        <button key={schedule.id} onClick={() => onSelect?.(schedule)} className="flex min-h-[64px] w-full cursor-pointer items-center justify-between rounded-2xl border border-border bg-surface px-4 text-left transition-colors active:bg-brand-100">
          <span className="min-w-0 truncate font-bold">{schedule.name}</span>
          <span className="tabular-nums text-sm text-ink-500">{new Date(schedule.startAt).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })}</span>
        </button>
      ))}
    </div>
  );
}
