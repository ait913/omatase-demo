import type { FeatureDTO, ScheduleDTO } from "@/shared/types";
import { usePutFeatureState } from "../api/hooks/useApi";
import { Button } from "./Section";

export function FeatureDetailSheet({ eventId, schedule, feature, onClose }: { eventId: string; schedule: ScheduleDTO; feature: FeatureDTO; onClose: () => void }) {
  const putState = usePutFeatureState(eventId, feature.id);
  const title = feature.kind === "meetup" ? "集合 (meetup)" : "持ち物確認 (checklist)";
  return (
    <div className="fixed inset-0 z-[1100] flex items-end justify-center bg-black/30">
      <div className="max-h-[80dvh] w-full max-w-[375px] overflow-y-auto rounded-t-3xl bg-surface p-5 shadow-md">
        <div className="mb-4 flex items-center justify-between">
          <button onClick={onClose}>←</button>
          <h2 className="font-bold">{title}</h2>
          <span />
        </div>
        {feature.kind === "meetup" && (
          <div className="space-y-5">
            <section>
              <h3 className="mb-2 text-sm font-bold text-ink-500">集合場所</h3>
              <p className="rounded-2xl border border-border p-4">{schedule.location?.label ?? "場所未設定"}</p>
            </section>
            <section className="space-y-2">
              <h3 className="text-sm font-bold text-ink-500">到着しましたか?</h3>
              <Button className="w-full" onClick={() => putState.mutate({ kind: "meetup", checkedInAt: Date.now() })}>到着しました</Button>
              {"checkedInAt" in feature.state && feature.state.checkedInAt ? <p className="text-sm text-success">あなたは到着済みです</p> : null}
            </section>
            <section className="text-sm">
              <h3 className="mb-2 font-bold text-ink-500">集合状況</h3>
              <p>{feature.aggregate?.doneCount ?? 0} / {feature.aggregate?.totalMembers ?? 0} 人が集合済み</p>
            </section>
          </div>
        )}
        {feature.kind === "checklist" && feature.config.kind === "checklist" && (
          <div className="space-y-5">
            <section>
              <h3 className="mb-2 text-sm font-bold text-ink-500">あなたのチェック</h3>
              <div className="space-y-2">
                {feature.config.items.map((item) => {
                  const checked = Boolean((feature.state as { checked?: Record<string, boolean> }).checked?.[item.id]);
                  return (
                    <label key={item.id} className="flex items-center gap-3 rounded-2xl border border-border p-3">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) =>
                          putState.mutate({
                            kind: "checklist",
                            checked: { ...((feature.state as { checked?: Record<string, boolean> }).checked ?? {}), [item.id]: e.target.checked },
                          })
                        }
                      />
                      {item.label}
                    </label>
                  );
                })}
              </div>
            </section>
            <section className="text-sm">
              <h3 className="mb-2 font-bold text-ink-500">全員の進捗</h3>
              <p>{feature.aggregate?.doneCount ?? 0} / {feature.aggregate?.totalMembers ?? 0} 人が完了</p>
              {feature.config.items.map((item) => <p key={item.id}>{item.label} {feature.aggregate?.perItem?.[item.id] ?? 0}/{feature.aggregate?.totalMembers ?? 0}</p>)}
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
