"use client";

import {
  Select,
  SelectItem,
  SelectValue,
  SelectContent,
  SelectTrigger,
} from "@/components/ui/select";
import { useSearch } from "@/hooks/use-search";
import Pagination from "@/components/pagination";
import { Separator } from "@/components/ui/separator";
import PackageCard, { PackageCardSkeleton } from "@/components/package-card";
import { PackageSort, PackageVerified, PackageCategory, PackageDeprecated } from "@/types/package-filter";

interface PackageListProps {
  ownerId?: string;
}

export const PackageListSkeleton = ({
  pagination,
}: ReturnType<typeof useSearch>) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 my-6">
      {Array.from({ length: pagination?.limit ?? 12 }).map((_, i) => (
        <PackageCardSkeleton key={i} />
      ))}
    </div>
  );
};

const PackageList = ({ ownerId }: PackageListProps) => {
  const {
    page,
    sort,
    error,
    loading,
    verified,
    packages,
    category,
    deprecated,
    pagination,
    initialLoad,
    handlePageChange,
    handleSortChange,
    handleVerifiedChange,
    handleCategoryChange,
    handleDeprecatedChange,
  } = useSearch({ ownerId });

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
        <span className="text-lg text-muted-foreground">
          {initialLoad || loading
            ? "Searching..."
            : pagination
            ? `${pagination.total.toLocaleString()} packages found`
            : "— packages"}
        </span>

        <div className="flex gap-2 flex-wrap">
          <Select value={sort} onValueChange={handleSortChange}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={PackageSort.NameAsc}>Name A–Z</SelectItem>
              <SelectItem value={PackageSort.NameDesc}>Name Z–A</SelectItem>
              <SelectItem value={PackageSort.Relevance}>Relevant</SelectItem>
              <SelectItem value={PackageSort.Downloads}>
                Most downloads
              </SelectItem>
              <SelectItem value={PackageSort.Updated}>
                Recently Updated
              </SelectItem>
              <SelectItem value={PackageSort.Newest}>
                Recently Published
              </SelectItem>
            </SelectContent>
          </Select>

          <Select value={verified} onValueChange={handleVerifiedChange}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Verification" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={PackageVerified.All}>All</SelectItem>
              <SelectItem value={PackageVerified.Verified}>Verified</SelectItem>
              <SelectItem value={PackageVerified.Unverified}>
                Unverified
              </SelectItem>
            </SelectContent>
          </Select>

          <Select value={deprecated} onValueChange={handleDeprecatedChange}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={PackageDeprecated.All}>All</SelectItem>
              <SelectItem value={PackageDeprecated.Deprecated}>
                Deprecated
              </SelectItem>
              <SelectItem value={PackageDeprecated.NotDeprecated}>
                Not Deprecated
              </SelectItem>
            </SelectContent>
          </Select>

          <Select value={category} onValueChange={handleCategoryChange}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={PackageCategory.All}>All</SelectItem>
              <SelectItem value={PackageCategory.Hook}>Hook</SelectItem>
              <SelectItem value={PackageCategory.Server}>Server</SelectItem>
              <SelectItem value={PackageCategory.Sandbox}>Sandbox</SelectItem>
              <SelectItem value={PackageCategory.Interceptor}>
                Interceptor
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Separator className="my-4" />

      {error && <div className="destructive mb-4">Error: {error}</div>}

      {initialLoad || loading ? (
        <PackageListSkeleton pagination={pagination} />
      ) : packages.length ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 my-6">
          {packages.map((pkg) => (
            <PackageCard key={pkg.id} {...pkg} />
          ))}
        </div>
      ) : (
        <div className="col-span-full text-center text-muted-foreground">
          No results
        </div>
      )}

      {pagination && pagination.totalPages > 1 && (
        <div className="flex justify-center mt-6">
          <Pagination
            page={page}
            onPageChange={handlePageChange}
            totalPages={pagination.totalPages}
          />
        </div>
      )}
    </>
  );
};

export default PackageList;
