import { Outlet } from "@tanstack/react-router";
import { MobileFrame } from "../components/MobileFrame";

export function RootLayout() {
  return (
    <MobileFrame>
      <Outlet />
    </MobileFrame>
  );
}
