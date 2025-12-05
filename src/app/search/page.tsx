"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { PackageCard } from "@/components/package-card"
import { Separator } from "@/components/ui/separator"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from "@/components/ui/pagination"

export default function SearchPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [sort, setSort] = useState(searchParams.get("sort") || "relevance")
  const [page, setPage] = useState(Number(searchParams.get("page")) || 1)
  const [verified, setVerified] = useState(searchParams.get("verified") || "all")
  const [category, setCategory] = useState(searchParams.get("category") || "all")
  const [query, _] = useState(searchParams.get("q") || "")

  const packages = [
    {
      name: "react",
      displayName: "React",
      description: "A JavaScript library for building user interfaces",
      version: "18.2.0",
      author: {
        displayName: "Facebook",
        username: "facebook"
      },
      category: "service" as const,
      verified: true,
      downloads: 18500000,
      updated: "2024-11-15",
      licenses: ["MIT", "Apache 2.0"]
    },
    {
      name: "next",
      displayName: "Next.js",
      description: "The React framework for production",
      version: "14.1.0",
      author: {
        displayName: "Vercel",
        username: "vercel"
      },
      category: "service" as const,
      verified: true,
      downloads: 5200000,
      updated: "2024-12-01",
      licenses: ["MIT"]
    },
    {
      name: "tailwindcss",
      displayName: "Tailwind CSS",
      description: "A utility-first CSS framework for rapid UI development",
      version: "3.3.2",
      author: {
        displayName: "Tailwind Labs",
        username: "tailwindlabs"
      },
      category: "interceptor" as const,
      verified: false,
      downloads: 12000000,
      updated: "2024-10-20",
      licenses: ["MIT"]
    },
  ]

  const totalPages = 5

  useEffect(() => {
    const params = new URLSearchParams()

    if (query) params.set("q", query)
    if (sort !== "relevance") params.set("sort", sort)
    if (page !== 1) params.set("page", page.toString())
    if (verified !== "all") params.set("verified", verified)
    if (category !== "all") params.set("category", category)

    router.push(`/search?${params.toString()}`, { scroll: false })
  }, [sort, page, verified, category, query, router])

  const handleSortChange = (value: string) => {
    setSort(value)
    setPage(1)
  }

  const handleVerifiedChange = (value: string) => {
    setVerified(value)
    setPage(1)
  }

  const handleCategoryChange = (value: string) => {
    setCategory(value)
    setPage(1)
  }

  const handlePageChange = (newPage: number) => {
    setPage(newPage)
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
        <span className="text-lg text-muted-foreground">1000+ packages found</span>

        <div className="flex gap-2 flex-wrap">
          <Select value={sort} onValueChange={handleSortChange}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Sort by"/>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="relevance">Relevant</SelectItem>
              <SelectItem value="downloads">Most downloads</SelectItem>
              <SelectItem value="published">Recently Published</SelectItem>
              <SelectItem value="updated">Recently Updated</SelectItem>
            </SelectContent>
          </Select>

          <Select value={verified} onValueChange={handleVerifiedChange}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Verification" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="verified">Verified</SelectItem>
              <SelectItem value="unverified">Unverified</SelectItem>
            </SelectContent>
          </Select>

          <Select value={category} onValueChange={handleCategoryChange}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="service">Service</SelectItem>
              <SelectItem value="interceptor">Interceptor</SelectItem>
              <SelectItem value="sandbox">Sandbox</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Separator className="my-4" />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 my-6">
        {packages.map(pkg => (
          <PackageCard key={pkg.name} {...pkg} />
        ))}
      </div>

      <div className="flex justify-center mt-6">
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                onClick={() => page > 1 && handlePageChange(page - 1)}
                className={page === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
              />
            </PaginationItem>

            {[...Array(totalPages)].map((_, i) => {
              const pageNumber = i + 1
              return (
                <PaginationItem key={i}>
                  <PaginationLink
                    isActive={pageNumber === page}
                    onClick={() => handlePageChange(pageNumber)}
                    className="cursor-pointer"
                  >
                    {pageNumber}
                  </PaginationLink>
                </PaginationItem>
              )
            })}

            {totalPages > 5 && (
              <PaginationItem>
                <PaginationEllipsis />
              </PaginationItem>
            )}

            <PaginationItem>
              <PaginationNext
                onClick={() => page < totalPages && handlePageChange(page + 1)}
                className={page === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>
    </div>
  )
}
