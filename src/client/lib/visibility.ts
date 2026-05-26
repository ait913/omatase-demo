export function isVisible() {
  if (typeof document === "undefined") return true;
  return document.visibilityState === "visible";
}
