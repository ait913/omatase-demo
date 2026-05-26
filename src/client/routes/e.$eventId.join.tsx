import { useNavigate, useParams } from "@tanstack/react-router";
import { useState } from "react";
import { useEvent, useJoinEvent } from "../api/hooks/useApi";
import { Button, TextInput } from "../components/Section";

export function JoinRoute() {
  const { eventId } = useParams({ strict: false }) as { eventId: string };
  const event = useEvent(eventId);
  const join = useJoinEvent(eventId);
  const [name, setName] = useState("");
  const navigate = useNavigate();
  return (
    <form
      className="space-y-6 p-6"
      onSubmit={(e) => {
        e.preventDefault();
        join.mutate(name, { onSuccess: () => navigate({ to: "/e/$eventId", params: { eventId } }) });
      }}
    >
      <p className="text-ink-500">あなたを招待中</p>
      <h1 className="text-2xl font-bold">{event.data?.event.name ?? "イベント"}</h1>
      <label className="block space-y-2">
        <span className="text-sm text-ink-500">あなたの表示名</span>
        <TextInput value={name} onChange={(e) => setName(e.target.value)} maxLength={40} placeholder="たんり" />
      </label>
      <Button className="w-full" disabled={!name.trim() || join.isPending}>参加する</Button>
    </form>
  );
}
