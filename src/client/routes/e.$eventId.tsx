import { useNavigate, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAnnouncements, useEvent, useEventChat, useMembers, usePostEventChat, useProgress, useSchedules } from "../api/hooks/useApi";
import { AnnouncementBoard } from "../components/AnnouncementBoard";
import { Avatar } from "../components/Avatar";
import { ChatBox } from "../components/ChatBox";
import { ScheduleEditSheet } from "../components/ScheduleEditSheet";
import { ScheduleList } from "../components/ScheduleList";
import { Section, Button } from "../components/Section";
import { ShareSheet } from "../components/ShareSheet";

export function EventHomeRoute() {
  const { eventId } = useParams({ strict: false }) as { eventId: string };
  const navigate = useNavigate();
  const event = useEvent(eventId);
  const members = useMembers(eventId);
  const schedules = useSchedules(eventId);
  const announcements = useAnnouncements(eventId);
  const progress = useProgress(eventId);
  const chat = useEventChat(eventId);
  const postChat = usePostEventChat(eventId);
  const [shareOpen, setShareOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  useEffect(() => {
    if (event.isError) navigate({ to: "/e/$eventId/join", params: { eventId } });
    if (event.data && !event.data.viewerIsMember) navigate({ to: "/e/$eventId/join", params: { eventId } });
  }, [event.isError, event.data, eventId, navigate]);

  useEffect(() => {
    if (event.data?.event.viewerIsHost === false && progress.data?.current) navigate({ to: "/e/$eventId/progress", params: { eventId } });
  }, [event.data?.event.viewerIsHost, progress.data?.current, eventId, navigate]);

  const isHost = Boolean(event.data?.event.viewerIsHost);
  const latest = announcements.data?.announcements[0]?.body;
  return (
    <div className="space-y-6 p-5">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{event.data?.event.name ?? "イベント"}</h1>
        <button className="rounded-full px-3 py-2 text-xl" onClick={() => setShareOpen(true)}>⋯</button>
      </header>
      <Section title="アナウンス">
        <AnnouncementBoard eventId={eventId} latest={latest} canPost={isHost} />
      </Section>
      <Section title="スケジュール" action={isHost ? <button className="text-xl text-brand-500" onClick={() => setEditOpen(true)}>+</button> : null}>
        <ScheduleList schedules={schedules.data?.schedules ?? []} />
      </Section>
      <Section title="メンバー">
        <div className="flex gap-2">{(members.data?.members ?? event.data?.members ?? []).slice(0, 6).map((m) => <Avatar key={m.userId} name={m.name} />)}</div>
      </Section>
      <Section title="チャット">
        <ChatBox messages={chat.data?.messages ?? []} pending={postChat.isPending} onSend={(body) => postChat.mutate(body)} />
      </Section>
      {progress.data?.current && <Button className="w-full" onClick={() => navigate({ to: "/e/$eventId/progress", params: { eventId } })}>▶ 進行を見る</Button>}
      {shareOpen && <ShareSheet url={`${window.location.origin}/e/${eventId}/join`} onClose={() => setShareOpen(false)} />}
      {editOpen && <ScheduleEditSheet eventId={eventId} onClose={() => setEditOpen(false)} />}
    </div>
  );
}
