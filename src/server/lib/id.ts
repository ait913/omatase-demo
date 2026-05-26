import { randomBytes } from "node:crypto";

const alphabet = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";

export function makeId(length: number) {
  const bytes = randomBytes(length);
  let id = "";
  for (const byte of bytes) id += alphabet[byte % alphabet.length];
  return id;
}
