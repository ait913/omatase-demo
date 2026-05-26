import { useNavigate, useParams } from "@tanstack/react-router";
import { useEffect } from "react";
import { useEvent, useProgress } from "../api/hooks/useApi";
import { ProgressView } from "../components/ProgressView";

export function ProgressRoute() {
  const { eventId } = useParams({ strict: false }) as { eventId: string };
  const event = useEvent(eventId);
  const progress = useProgress(eventId);
  const navigate = useNavigate();
  useEffect(() => {
    if (event.isError || event.data?.viewerIsMember === false) navigate({ to: "/e/$eventId/join", params: { eventId } });
  }, [event.isError, event.data?.viewerIsMember, eventId, navigate]);
  if (!progress.data) return <div className="p-6 text-ink-500">読み込み中</div>;
  return <ProgressView data={progress.data} />;
}
