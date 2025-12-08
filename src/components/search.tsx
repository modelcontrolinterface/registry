"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const useSearch = () => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState(() => searchParams?.get("q") || "");

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

interface SearchInputProps {
  large?: boolean;
}

const SearchInput = ({ large = false }: SearchInputProps) => {
  const { query, setQuery, inputRef, submit, handleKeyPress } = useSearch();

  return (
    <div className={`w-full flex items-center gap-1 bg-background ${large ? "h-16" : "h-10"}`}>
      <Input
        ref={inputRef}
        value={query}
        onKeyDown={handleKeyPress}
        onChange={(e) => setQuery(e.target.value)}
        className="h-full pl-4"
        placeholder="Search for a service"
      />
      <Button onClick={submit} className="aspect-square h-full">
        <Search />
      </Button>
    </div>
  );
}

export default SearchInput
