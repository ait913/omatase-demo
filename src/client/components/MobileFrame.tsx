import type { ReactNode } from "react";

export function MobileFrame({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-[#EEEEEC] sm:flex sm:items-center sm:justify-center sm:p-6">
      <main data-testid="mobile-frame" className="min-h-dvh w-full bg-bg sm:h-[812px] sm:min-h-0 sm:w-[375px] sm:overflow-hidden sm:rounded-3xl sm:shadow-md">
        <div className="h-full overflow-y-auto">{children}</div>
      </main>
    </div>
  );
}
