import type { ChatMessageDTO } from "@/shared/types";
import { useState } from "react";
import { Button, TextInput } from "./Section";

export function ChatBox({ messages, onSend, pending }: { messages: ChatMessageDTO[]; onSend: (body: string) => void; pending?: boolean }) {
  const [body, setBody] = useState("");
  return (
    <div className="space-y-3 rounded-2xl border border-border bg-surface p-3">
      <div className="max-h-40 space-y-2 overflow-y-auto">
        {messages.map((m) => (
          <div key={m.id} className="text-sm">
            <span className="font-bold">{m.authorName}</span>
            <span className="ml-2 text-ink-500">{m.body}</span>
          </div>
        ))}
        {messages.length === 0 && <p className="text-sm text-ink-500">メッセージはまだありません</p>}
      </div>
      <div className="flex gap-2">
        <TextInput value={body} onChange={(e) => setBody(e.target.value)} maxLength={2000} />
        <Button
          disabled={!body.trim() || pending}
          onClick={() => {
            onSend(body);
            setBody("");
          }}
        >
          送信
        </Button>
      </div>
    </div>
  );
}
