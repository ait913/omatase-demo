import { QRCodeSVG } from "qrcode.react";
import { useState } from "react";
import { copyText } from "../lib/clipboard";
import { Button } from "./Section";

export function ShareSheet({ url, onClose }: { url: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="fixed inset-0 z-[1100] flex items-end justify-center bg-black/30">
      <div className="w-full max-w-[375px] rounded-t-3xl bg-surface p-6 shadow-md">
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-border" />
        <h2 className="mb-6 text-center text-xl font-bold">URL を共有</h2>
        <div className="mx-auto grid size-[220px] place-items-center rounded-2xl border border-border bg-white">
          <QRCodeSVG value={url} size={190} />
        </div>
        <p className="mt-4 truncate text-center text-sm text-ink-500">{url}</p>
        <div className="mt-6 space-y-3">
          <Button
            className="w-full"
            onClick={async () => {
              await copyText(url);
              setCopied(true);
              window.setTimeout(() => setCopied(false), 2000);
            }}
          >
            {copied ? "コピー済" : "URL をコピー"}
          </Button>
          {"share" in navigator && (
            <Button className="w-full" variant="soft" onClick={() => navigator.share({ url })}>
              共有...
            </Button>
          )}
          <Button className="w-full" variant="ghost" onClick={onClose}>
            閉じる
          </Button>
        </div>
      </div>
    </div>
  );
}
