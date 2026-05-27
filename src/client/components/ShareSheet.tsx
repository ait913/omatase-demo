import { QRCodeSVG } from "qrcode.react";
import { useState } from "react";
import { copyText } from "../lib/clipboard";
import { Button } from "./Section";
import { Sheet } from "./Sheet";

export function ShareSheet({ url, onClose }: { url: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  return (
    <Sheet open onDismiss={onClose} title="URL を共有">
      <div>
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
    </Sheet>
  );
}
