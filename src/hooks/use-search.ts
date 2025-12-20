import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { GetPackagesApiResponse } from "@/app/api/v1/packages/route";

export const useSearch = () => {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialQuery = searchParams.get("q") || "";
  const initialPage = Number(searchParams.get("page")) || 1;
  const initialSort = searchParams.get("sort") || "relevance";
  const initialVerified = searchParams.get("verified") || "all";
  const initialCategories = searchParams.get("categories") || "all";

  const [query] = useState(initialQuery);
  const [page, setPage] = useState<number>(initialPage);
  const [sort, setSort] = useState<string>(initialSort);
  const [verified, setVerified] = useState<string>(initialVerified);
  const [categories, setCategories] = useState<string>(initialCategories);

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [initialLoad, setInitialLoad] = useState<boolean>(true);
  const [packages, setPackages] = useState<GetPackagesApiResponse["packages"]>(
    [],
  );
  const [pagination, setPagination] = useState<
    GetPackagesApiResponse["pagination"] | null
  >(null);

  useEffect(() => {
    const params = new URLSearchParams();

    if (query) params.set("q", query);
    if (categories !== "all") params.set("categories", categories);
    if (sort !== "relevance") params.set("sort", sort);
    if (page !== 1) params.set("page", String(page));
    if (verified !== "all") params.set("verified", verified);

    router.push(`/search?${params.toString()}`, { scroll: false });
  }, [categories, page, sort, verified, query, router]);

  useEffect(() => {
    const controller = new AbortController();
    const signal = controller.signal;

    const fetchData = async () => {
      setError(null);
      setLoading(true);

      try {
        const params = new URLSearchParams();

        if (query) params.set("q", query);
        if (categories !== "all") params.set("categories", categories);
        if (sort) params.set("sort", sort);
        if (page) params.set("page", String(page));

        params.set("limit", "12");

        if (verified !== "all") params.set("verified", verified);

        const url = `/api/v1/packages?${params.toString()}`;
        const res = await fetch(url, { signal });

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }

        const json: GetPackagesApiResponse = await res.json();

        const processedPackages = json.packages.map((pkg) => ({
          ...pkg,
        }));

        setPackages(processedPackages || []);
        setPagination(json.pagination || null);
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") return;
        setError((err instanceof Error ? err.message : String(err)) || "Failed to fetch");
        setPackages([]);
        setPagination(null);
      } finally {
        setLoading(false);
        setInitialLoad(false);
      }
    };

    fetchData();
    return () => controller.abort();
  }, [query, categories, sort, page, verified]);

  const handleSortChange = (value: string) => {
    setSort(value);
    setPage(1);
  };

  const handleVerifiedChange = (value: string) => {
    setVerified(value);
    setPage(1);
  };

  const handleCategoriesChange = (value: string) => {
    setCategories(value);
    setPage(1);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  return {
    query,
    categories,
    page,
    sort,
    verified,
    loading,
    packages,
    error,
    initialLoad,
    pagination,
    handleSortChange,
    handleVerifiedChange,
    handleCategoriesChange,
    handlePageChange,
  };
};
