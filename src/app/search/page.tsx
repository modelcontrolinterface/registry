"use client";

import { Suspense } from "react"; // Import Suspense
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSearch } from "@/hooks/use-search";
import Pagination from "@/components/pagination";
import ServiceCard from "@/components/service-card";
import { Separator } from "@/components/ui/separator";
import ServiceCardSkeleton from "@/components/service-card-skeleton";

const SearchPageContent = () => {
  const {
    type,
    page,
    sort,
    error,
    loading,
    verified,
    services,
    pagination,
    initialLoad,
    handleTypeChange,
    handlePageChange,
    handleSortChange,
    handleVerifiedChange,
  } = useSearch();

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
        <span className="text-lg text-muted-foreground">
          {initialLoad || loading
            ? "Searching..."
            : pagination
              ? `${pagination.total.toLocaleString()} services found`
              : "— services"}
        </span>

        <div className="flex gap-2 flex-wrap">
          <Select value={sort} onValueChange={handleSortChange}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="relevance">Relevant</SelectItem>
              <SelectItem value="downloads">Most downloads</SelectItem>
              <SelectItem value="newest">Recently Published</SelectItem>
              <SelectItem value="updated">Recently Updated</SelectItem>
              <SelectItem value="name-asc">Name A–Z</SelectItem>
              <SelectItem value="name-desc">Name Z–A</SelectItem>
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

          <Select value={type} onValueChange={handleTypeChange}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Type" />
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

      {error && <div className="destructive mb-4">Error: {error}</div>}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 my-6">
        {initialLoad || loading ? (
          Array.from({ length: pagination?.limit ?? 12 }).map((_, i) => (
            <ServiceCardSkeleton key={i} />
          ))
        ) : services.length ? (
          services.map((service) => (
            <ServiceCard key={service.id} {...service} />
          ))
        ) : (
          <div className="col-span-full text-center text-muted-foreground">
            No results
          </div>
        )}
      </div>

      {pagination && pagination.totalPages > 1 && (
        <div className="flex justify-center mt-6">
          <Pagination
            page={page}
            totalPages={pagination.totalPages}
            onPageChange={handlePageChange}
          />
        </div>
      )}
    </div>
  );
};

const SearchPage = () => {
  return (
    <Suspense fallback={<div>Loading search results...</div>}>
      <SearchPageContent />
    </Suspense>
  );
};

export default SearchPage;
