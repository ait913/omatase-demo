import { useState } from "react";
import type { FeatureDTO } from "@/shared/types";

export function ChecklistDoneBanner({ eventId, feature, onOpen }: { eventId: string; feature: FeatureDTO; onOpen: () => void }) {
  const key = `omatase-checklist-done-dismissed:${eventId}:${feature.id}`;
  const [dismissed, setDismissed] = useState(() => typeof sessionStorage !== "undefined" && sessionStorage.getItem(key) === "true");
  if (dismissed) return null;
  return (
    <div className="flex min-h-14 items-center gap-3 rounded-2xl border border-success/30 bg-success/10 px-3 text-success">
      <button className="flex min-h-14 min-w-0 flex-1 items-center gap-3 text-left" onClick={onOpen}>
        <span className="font-bold">✓</span>
        <span className="truncate font-bold">持ち物確認 全員完了!</span>
      </button>
      <button
        aria-label="閉じる"
        className="min-h-11 min-w-11 rounded-full"
        onClick={() => {
          sessionStorage.setItem(key, "true");
          setDismissed(true);
        }}
      >
        ×
      </button>
    </div>
  );
}
