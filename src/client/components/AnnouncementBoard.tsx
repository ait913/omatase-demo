import { useState } from "react";
import { Button, TextArea } from "./Section";
import { usePostAnnouncement } from "../api/hooks/useApi";

export function AnnouncementBoard({ eventId, latest, canPost }: { eventId: string; latest?: string; canPost: boolean }) {
  const [body, setBody] = useState("");
  const post = usePostAnnouncement(eventId);
  if (!canPost) {
    return <div className="rounded-2xl border border-border bg-surface p-4 text-sm">{latest || "アナウンスはまだありません"}</div>;
  }
  return (
    <div className="space-y-2">
      <TextArea rows={4} value={body} onChange={(e) => setBody(e.target.value)} placeholder="ここに textarea" maxLength={500} />
      <div className="flex justify-end">
        <Button disabled={!body.trim() || post.isPending} onClick={() => post.mutate(body, { onSuccess: () => setBody("") })}>
          送信
        </Button>
      </div>
    </div>
  );
}
