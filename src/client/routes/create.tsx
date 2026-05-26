import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useCreateEvent } from "../api/hooks/useApi";
import { Button, TextInput } from "../components/Section";

export function CreateRoute() {
  const [eventName, setEventName] = useState("大阪旅行");
  const [guestName, setGuestName] = useState("");
  const create = useCreateEvent();
  const navigate = useNavigate();
  return (
    <form
      className="space-y-6 p-6"
      onSubmit={(e) => {
        e.preventDefault();
        create.mutate(
          { eventName, guestName },
          { onSuccess: (data) => navigate({ to: "/create/where", search: { eventId: data.event.id } }) },
        );
      }}
    >
      <a href="/" className="text-sm text-ink-500">← 戻る</a>
      <h1 className="text-2xl font-bold">イベントを作る</h1>
      <label className="block space-y-2">
        <span className="text-sm text-ink-500">イベント名</span>
        <TextInput value={eventName} onChange={(e) => setEventName(e.target.value)} maxLength={80} />
      </label>
      <label className="block space-y-2">
        <span className="text-sm text-ink-500">あなたの表示名</span>
        <TextInput value={guestName} onChange={(e) => setGuestName(e.target.value)} maxLength={40} placeholder="たんり" />
        <span className="text-xs text-ink-500">メンバーに見える名前</span>
      </label>
      <Button className="w-full" disabled={!eventName.trim() || !guestName.trim() || create.isPending}>つぎへ →</Button>
    </form>
  );
}
