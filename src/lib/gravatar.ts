import { createHash } from "node:crypto";

export function gravatarUrl(email: string, size = 160): string {
  const normalized = email.trim().toLowerCase();
  const hash = createHash("sha256").update(normalized).digest("hex");
  return `https://www.gravatar.com/avatar/${hash}?s=${size}&d=identicon&r=pg`;
}

export const glorifierNpmProfile = "https://www.npmjs.com/~glorifier";
