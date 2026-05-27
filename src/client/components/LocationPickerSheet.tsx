import type { ScheduleLocationDTO } from "@/shared/types";
import { useEffect, useRef, useState } from "react";
import { MapSection } from "./MapSection";
import { Button, TextInput } from "./Section";
import { Sheet } from "./Sheet";

const TOKYO_STATION: ScheduleLocationDTO = { lat: 35.681236, lng: 139.767125, label: "" };

interface NominatimResult {
  display_name: string;
  lat: string;
  lon: string;
}

export function LocationPickerSheet({
  open,
  initial,
  onResolve,
  onDismiss,
  stackLevel = 2,
}: {
  open: boolean;
  initial?: ScheduleLocationDTO | null;
  onResolve: (result: ScheduleLocationDTO) => void;
  onDismiss: () => void;
  stackLevel?: 1 | 2;
}) {
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState<ScheduleLocationDTO>(initial ?? TOKYO_STATION);
  const [label, setLabel] = useState(initial?.label ?? "");
  const [results, setResults] = useState<NominatimResult[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "none" | "error">("idle");
  const [error, setError] = useState("");
  const [retryCount, setRetryCount] = useState(0);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!open) return;
    const next = initial ?? TOKYO_STATION;
    setLocation(next);
    setLabel(initial?.label ?? "");
    setQuery("");
    setResults([]);
    setStatus("idle");
    setError("");
  }, [initial, open]);

  useEffect(() => {
    if (!open || !query.trim()) {
      abortRef.current?.abort();
      setResults([]);
      setStatus("idle");
      return;
    }
    const timer = window.setTimeout(() => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      const timeout = window.setTimeout(() => controller.abort(), 10000);
      setStatus("loading");
      fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=8&accept-language=ja`, {
        signal: controller.signal,
      })
        .then((res) => {
          if (!res.ok) throw new Error("search failed");
          return res.json() as Promise<NominatimResult[]>;
        })
        .then((json) => {
          setResults(json);
          setStatus(json.length === 0 ? "none" : "idle");
        })
        .catch((err: unknown) => {
          if ((err as { name?: string }).name === "AbortError") return;
          setStatus("error");
        })
        .finally(() => window.clearTimeout(timeout));
    }, 500);
    return () => window.clearTimeout(timer);
  }, [open, query, retryCount]);

  const useGeolocation = () => {
    if (!navigator.geolocation) {
      setError("現在地を取得できませんでした");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude, label });
        setLabel("");
        setError("");
      },
      () => setError("現在地を取得できませんでした"),
      { timeout: 8000, enableHighAccuracy: false },
    );
  };

  const decide = () => {
    const trimmed = label.trim();
    if (!trimmed) {
      setError("場所のラベルを入力してください");
      return;
    }
    onResolve({ lat: location.lat, lng: location.lng, label: trimmed });
  };

  return (
    <Sheet open={open} onDismiss={onDismiss} title="場所を選ぶ" stackLevel={stackLevel} rightAction={{ label: "決定", onClick: decide }}>
      <div className="space-y-4">
        <TextInput placeholder="場所を検索" value={query} onChange={(e) => setQuery(e.target.value)} />
        <button type="button" className="min-h-11 rounded-full bg-brand-100 px-4 text-sm font-bold text-brand-500" onClick={useGeolocation}>
          📍 現在地を使う
        </button>
        {(results.length > 0 || status === "none" || status === "error" || status === "loading") && (
          <section className="space-y-2">
            <h3 className="text-sm font-bold text-ink-500">検索結果</h3>
            {status === "loading" && <p className="text-sm text-ink-500">検索中...</p>}
            {status === "none" && <p className="text-sm text-ink-500">該当なし</p>}
            {status === "error" && (
              <p className="text-sm text-warning">
                検索できませんでした{" "}
                <button className="min-h-11 text-brand-500 underline" onClick={() => setRetryCount((value) => value + 1)}>
                  リトライ
                </button>
              </p>
            )}
            {results.map((result) => (
              <button
                key={`${result.lat}:${result.lon}:${result.display_name}`}
                className="min-h-[60px] w-full truncate rounded-2xl border border-border bg-surface px-4 text-left text-sm transition-colors active:bg-brand-100"
                onClick={() => {
                  const next = { lat: Number(result.lat), lng: Number(result.lon), label: result.display_name.slice(0, 60) };
                  setLocation(next);
                  setLabel(next.label);
                }}
              >
                {result.display_name}
              </button>
            ))}
          </section>
        )}
        <section className="space-y-2">
          <h3 className="text-sm font-bold text-ink-500">地図</h3>
          <MapSection value={{ ...location, label }} onChange={(next) => setLocation({ ...next, label })} height={260} />
        </section>
        <label className="block space-y-2">
          <span className="text-sm font-bold text-ink-500">場所のラベル</span>
          <TextInput value={label} onChange={(e) => setLabel(e.target.value)} placeholder="東京駅 丸の内中央口" />
        </label>
        {error && <p className="text-sm text-warning">{error}</p>}
      </div>
    </Sheet>
  );
}
