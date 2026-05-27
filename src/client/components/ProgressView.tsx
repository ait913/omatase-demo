import type { FeatureDTO } from "@/shared/types";
import { useState } from "react";
import { useCompleteSchedule, usePostScheduleChat, useScheduleChat } from "../api/hooks/useApi";
import { ChatBox } from "./ChatBox";
import { ChecklistDoneBanner } from "./ChecklistDoneBanner";
import { FeatureSettingsSheet } from "./FeatureSettingsSheet";
import { Button } from "./Section";
import type { ProgressDTO } from "@/shared/types";

export function ProgressView({ data }: { data: ProgressDTO }) {
  const [selected, setSelected] = useState<FeatureDTO | null>(null);
  const current = data.current;
  const chat = useScheduleChat(current?.id, current?.status === "completed");
  const postChat = usePostScheduleChat(current?.id ?? "");
  const complete = useCompleteSchedule(data.event.id, current?.id ?? "");
  if (!current && data.next) {
    return (
      <div className="space-y-4 p-6">
        <h1 className="text-2xl font-bold">まだ始まっていません</h1>
        <p>次: {new Date(data.next.startAt).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })} {data.next.name}</p>
        <a className="text-brand-500" href={`/e/${data.event.id}`}>← ホームへ戻る</a>
      </div>
    );
  }
  if (!current) {
    return (
      <div className="space-y-4 p-6">
        <h1 className="text-2xl font-bold">おつかれさまでした!</h1>
        <p>最後: {data.prev?.name ?? "Schedule なし"}</p>
        <a className="text-brand-500" href={`/e/${data.event.id}`}>← ホームへ戻る</a>
      </div>
    );
  }
  return (
    <div className="space-y-5 p-5">
      <header className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold">{data.event.name}</h1>
          <p className="mt-2 text-sm text-ink-500">現在のスケジュール</p>
          <div className="mt-1 flex items-end gap-3">
            <h2 className="text-3xl font-bold leading-tight">{current.name}</h2>
            <span className="pb-1 tabular-nums">{new Date(current.startAt).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })}</span>
          </div>
        </div>
        {data.event.viewerIsHost && <a className="grid min-h-11 min-w-11 place-items-center rounded-full bg-brand-100 text-brand-500" href={`/e/${data.event.id}`}>⌂</a>}
      </header>
      {data.event.viewerIsHost &&
        current.features
          .filter((feature) => feature.kind === "checklist" && feature.aggregate?.allMembersDone)
          .map((feature) => <ChecklistDoneBanner key={feature.id} eventId={data.event.id} feature={feature} onOpen={() => setSelected(feature)} />)}
      {data.latestAnnouncement && <div className="rounded-2xl border border-border bg-surface p-4 text-sm">{data.latestAnnouncement.body}</div>}
      <section className="space-y-2">
        <h3 className="text-sm font-bold text-ink-500">機能</h3>
        {current.features.map((feature) => (
          <button key={feature.id} onClick={() => setSelected(feature)} className="flex min-h-[72px] w-full items-center gap-3 rounded-2xl border border-border bg-surface px-4 text-left transition-colors active:bg-brand-100">
            <span>{feature.kind === "meetup" ? "📍" : "☑"}</span>
            <span className="min-w-0 flex-1">
              <span className="block font-bold">{feature.kind === "meetup" ? "集合" : "持ち物確認"}</span>
              <span className="block truncate text-sm text-ink-500">{feature.aggregate?.doneCount ?? 0}/{feature.aggregate?.totalMembers ?? 0} {feature.kind === "meetup" ? "人集合済み" : "人完了"}</span>
            </span>
            <span className="text-ink-500">›</span>
          </button>
        ))}
      </section>
      {data.next && (
        <section>
          <h3 className="text-sm font-bold text-ink-500">次の Schedule</h3>
          <p className="mt-1 rounded-2xl border border-border bg-surface p-3">{new Date(data.next.startAt).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })} {data.next.name}</p>
        </section>
      )}
      <section className="space-y-2">
        <h3 className="text-sm font-bold text-ink-500">チャット</h3>
        <ChatBox messages={chat.data?.messages ?? []} pending={postChat.isPending} onSend={(body) => postChat.mutate(body)} />
      </section>
      <div className="grid grid-cols-3 gap-2">
        <Button className="min-h-12" variant="soft" disabled={!data.prev}>← 前へ</Button>
        <Button className="min-h-12" disabled={complete.isPending} onClick={() => complete.mutate()}>完了</Button>
        <Button className="min-h-12" variant="soft" disabled={!data.next}>次→</Button>
      </div>
      {selected && <FeatureSettingsSheet open eventId={data.event.id} schedule={current} feature={selected} mode="runtime" onDismiss={() => setSelected(null)} viewerIsHost={data.event.viewerIsHost} />}
    </div>
  );
}
