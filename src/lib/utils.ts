import crypto from "crypto";
import { twMerge } from "tailwind-merge";
import { clsx, type ClassValue } from "clsx";
import { authorRegex } from "@/lib/regex";

export const cn = (...inputs: ClassValue[]) => {
  return twMerge(clsx(inputs));
};

export const safeNumber = (v: string | null, fallback = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

export const formatDownloads = (downloads: number) => {
  if (downloads >= 1_000_000) return `${(downloads / 1_000_000).toFixed(2)}M`;
  if (downloads >= 1_000) return `${(downloads / 1_000).toFixed(1)}K`;
  return `${downloads}`;
};

export const formatBytes = (bytes: number) => {
  if (bytes >= 1_000_000) return `${(bytes / 1_000_000).toFixed(2)}MB`;
  if (bytes >= 1_000) return `${(bytes / 1_000).toFixed(1)}KB`;
  return `${bytes}B`;
};

export const textFetcher = (url: string) =>
  fetch(url).then((res) => res.text());

export const fetcher = async (url: string) => {
  const res = await fetch(url);

  if (!res.ok) {
    const error = new Error(
      "An error occurred while fetching the data.",
    ) as Error & {
      info: any;
      status: number;
    };

    try {
      error.info = await res.json();
    } catch (e) {
      error.info = await res.text();
    }

    error.status = res.status;
    throw error;
  }

  return res.json();
};

export const compareSemanticVersions = (v1: string, v2: string): number => {
  const parse = (version: string) => {
    const parts = version.split("-");
    const main = parts[0].split(".").map(Number);
    const pre = parts.length > 1 ? parts[1].split(".").filter(Boolean) : [];
    return { main, pre };
  };

  const p1 = parse(v1);
  const p2 = parse(v2);

  for (let i = 0; i < Math.max(p1.main.length, p2.main.length); i++) {
    const n1 = p1.main[i] || 0;
    const n2 = p2.main[i] || 0;
    if (n1 !== n2) return n1 - n2;
  }

  if (p1.pre.length === 0 && p2.pre.length === 0) return 0;
  if (p1.pre.length === 0) return 1;
  if (p2.pre.length === 0) return -1;

  for (let i = 0; i < Math.max(p1.pre.length, p2.pre.length); i++) {
    const s1 = p1.pre[i];
    const s2 = p2.pre[i];

    if (s1 === undefined) return -1;
    if (s2 === undefined) return 1;

    const isNum1 = /^\d+$/.test(s1);
    const isNum2 = /^\d+$/.test(s2);

    if (isNum1 && isNum2) {
      const n1 = Number(s1);
      const n2 = Number(s2);
      if (n1 !== n2) return n1 - n2;
    } else if (isNum1) {
      return -1;
    } else if (isNum2) {
      return 1;
    } else {
      if (s1 !== s2) return s1.localeCompare(s2);
    }
  }

  return 0;
};

export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function generateApiToken(): { token: string; hashedToken: string } {
  const token = crypto.randomBytes(32).toString("base64url");
  const hashedToken = hashToken(token);
  return { token, hashedToken };
}

export const parseAuthorString = (authorString: string) => {
  const match = authorRegex.exec(authorString);
  if (!match) {
    return { name: authorString };
  }
  const [, name, email, url] = match;
  return {
    name: name.trim(),
    email: email?.trim(),
    url: url?.trim(),
  };
};
