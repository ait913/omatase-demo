import type { PeriodSummaryDTO } from "@/shared/types";

const dateTimeFormatter = new Intl.DateTimeFormat("ja-JP", {
  timeZone: "Asia/Tokyo",
  month: "long",
  day: "numeric",
  weekday: "short",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const dateFormatter = new Intl.DateTimeFormat("ja-JP", {
  timeZone: "Asia/Tokyo",
  month: "long",
  day: "numeric",
  weekday: "short",
});

const timeFormatter = new Intl.DateTimeFormat("ja-JP", {
  timeZone: "Asia/Tokyo",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

export function PeriodBanner({ period }: { period: PeriodSummaryDTO | null }) {
  if (!period) return null;
  const start = new Date(period.startAt);
  const end = new Date(period.endAt);
  return (
    <p className="text-sm tabular-nums text-ink-500">
      {period.sameDay ? `${dateTimeFormatter.format(start)} 〜 ${timeFormatter.format(end)}` : `${dateFormatter.format(start)} 〜 ${dateFormatter.format(end)}`}
    </p>
  );
}
