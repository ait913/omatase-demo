import type { FeatureDTO, ScheduleDTO } from "@/shared/types";
import { ChecklistSheet } from "./ChecklistSheet";
import { MeetupSheet } from "./MeetupSheet";

export function FeatureSettingsSheet(props: {
  open: boolean;
  eventId: string;
  schedule: ScheduleDTO;
  feature: FeatureDTO;
  mode: "config" | "runtime";
  onDismiss: () => void;
  viewerIsHost?: boolean;
  stackLevel?: 1 | 2;
}) {
  if (props.feature.kind === "meetup") return <MeetupSheet {...props} />;
  return <ChecklistSheet {...props} />;
}
