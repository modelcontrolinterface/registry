import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import useSWR from "swr";
import { GetPackagesApiResponse } from "@/app/api/v1/packages/route";
import {
  PackageSort,
  PackageVerified,
  PackageCategory,
  PackageDeprecated,
} from "@/lib/enums";
import { fetcher } from "@/lib/fetcher";

interface UseSearchProps {
  ownerId?: string;
}

export const useSearch = ({ ownerId }: UseSearchProps = {}) => {
  const router = useRouter();
  const searchParams = useSearchParams();

  const query = searchParams.get("q") || "";
  const initialPage = Number(searchParams.get("page")) || 1;
  const initialSort = searchParams.get("sort") || PackageSort.Relevance;
  const initialVerified = searchParams.get("verified") || PackageVerified.All;
  const initialCategory = searchParams.get("category") || PackageCategory.All;
  const initialDeprecated =
    searchParams.get("deprecated") || PackageDeprecated.All;

  const [page, setPage] = useState<number>(initialPage);
  const [sort, setSort] = useState<PackageSort>(initialSort as PackageSort);
  const [verified, setVerified] = useState<PackageVerified>(
    initialVerified as PackageVerified,
  );
  const [category, setCategory] = useState<PackageCategory>(
    initialCategory as PackageCategory,
  );
  const [deprecated, setDeprecated] = useState<PackageDeprecated>(
    initialDeprecated as PackageDeprecated,
  );

  useEffect(() => {
    if (ownerId) return;

    const params = new URLSearchParams();

    if (query) params.set("q", query);
    if (page !== 1) params.set("page", String(page));
    if (sort !== PackageSort.Relevance) params.set("sort", sort);
    if (verified !== PackageVerified.All) params.set("verified", verified);
    if (category !== PackageCategory.All) params.set("category", category);
    if (deprecated !== PackageDeprecated.All) params.set("deprecated", deprecated);

    router.push(`/search?${params.toString()}`, { scroll: false });
  }, [category, page, sort, verified, deprecated, query, router, ownerId]);

  const params = new URLSearchParams();
  if (ownerId) params.set("owner", ownerId);
  if (query) params.set("q", query);
  if (sort) params.set("sort", sort);
  if (page) params.set("page", String(page));
  if (category !== PackageCategory.All) params.set("category", category);
  if (deprecated !== PackageDeprecated.All) params.set("deprecated", deprecated);
  params.set("limit", "12");
  if (verified !== PackageVerified.All) params.set("verified", verified);
  const url = `/api/v1/packages?${params.toString()}`;

  const { data, error, isLoading } = useSWR<GetPackagesApiResponse>(url, fetcher);

  const handleSortChange = (value: string) => {
    setPage(1);
    setSort(value as PackageSort);
  };

  const handleVerifiedChange = (value: string) => {
    setPage(1);
    setVerified(value as PackageVerified);
  };

  const handleCategoryChange = (value: string) => {
    setPage(1);
    setCategory(value as PackageCategory);
  };

  const handleDeprecatedChange = (value: string) => {
    setPage(1);
    setDeprecated(value as PackageDeprecated);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  return {
    page,
    sort,
    query,
    error: error ? error.message : null,
    loading: isLoading,
    verified,
    packages: data?.packages || [],
    category,
    deprecated,
    pagination: data?.pagination || null,
    initialLoad: isLoading && !data,
    handleSortChange,
    handlePageChange,
    handleVerifiedChange,
    handleCategoryChange,
    handleDeprecatedChange,
  };
};

