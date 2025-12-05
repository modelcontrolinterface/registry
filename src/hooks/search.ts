"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useState, useRef, useEffect } from "react";

export function useSearch() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [query, setQuery] = useState(() => searchParams?.get("q") || "");
  const inputRef = useRef<HTMLInputElement>(null);

  const submit = () => {
    if (!query.trim()) return;

    const params = new URLSearchParams(Array.from(searchParams?.entries() || []));
    params.set("q", query);

    const targetPath = pathname === "/search" ? pathname : "/search";
    router.push(`${targetPath}?${params.toString()}`);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") submit();
  };

  useEffect(() => {
    setQuery(searchParams?.get("q") || "");
  }, [searchParams]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === "/" &&
        document.activeElement?.tagName !== "INPUT" &&
        document.activeElement?.tagName !== "TEXTAREA"
      ) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return { query, setQuery, inputRef, submit, handleKeyPress };
}
