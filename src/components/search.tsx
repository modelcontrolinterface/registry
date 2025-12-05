"use client"

import { useSearch } from "@/hooks/search"

import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

interface SearchInputProps { large?: boolean }

export function SearchInput({ large = false }: SearchInputProps) {
  const { query, setQuery, inputRef, submit, handleKeyPress } = useSearch()

  return (
    <div className={`w-full flex items-center gap-1 bg-background ${ large ? "h-16" : "h-10" }`}>
        <Input
          ref={inputRef}
          value={query}
          onKeyDown={handleKeyPress}
          onChange={(e) => setQuery(e.target.value)}
          className="h-full pl-4 border-2"
          placeholder="Search for a service"
        />
      <Button onClick={submit} className="aspect-square h-full border-2">
        <Search />
      </Button>
    </div>
  )
}
