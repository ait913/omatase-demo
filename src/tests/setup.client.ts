import "@testing-library/jest-dom/vitest";
import React from "react";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

vi.mock("react-leaflet", () => ({
  MapContainer: ({ children }: { children: React.ReactNode }) => React.createElement("div", { "data-testid": "map-section" }, children),
  TileLayer: () => null,
  Marker: ({ children }: { children?: React.ReactNode }) => React.createElement("div", { "data-testid": "map-marker" }, children),
  Popup: ({ children }: { children?: React.ReactNode }) => React.createElement("div", null, children),
  useMap: () => ({}),
  useMapEvents: () => null,
}));

Object.defineProperty(navigator, "clipboard", {
  value: { writeText: vi.fn().mockResolvedValue(undefined) },
  configurable: true,
});

Object.defineProperty(window, "scrollTo", {
  value: vi.fn(),
  configurable: true,
});

afterEach(() => {
  cleanup();
});
