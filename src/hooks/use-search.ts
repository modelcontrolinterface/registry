import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { GetServicesApiResponse } from "@/app/api/v1/services/route";

export const useSearch = () => {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialQuery = searchParams.get("q") || "";
  const initialType = searchParams.get("type") || "all";
  const initialPage = Number(searchParams.get("page")) || 1;
  const initialSort = searchParams.get("sort") || "relevance";
  const initialVerified = searchParams.get("verified") || "all";

  const [query] = useState(initialQuery);
  const [type, setType] = useState<string>(initialType);
  const [page, setPage] = useState<number>(initialPage);
  const [sort, setSort] = useState<string>(initialSort);
  const [verified, setVerified] = useState<string>(initialVerified);

  const [loading, setLoading] = useState<boolean>(false);
  const [services, setServices] = useState<GetServicesApiResponse["services"]>([]);
  const [error, setError] = useState<string | null>(null);
  const [initialLoad, setInitialLoad] = useState<boolean>(true);
  const [pagination, setPagination] = useState<
    GetServicesApiResponse["pagination"] | null
  >(null);

  useEffect(() => {
    const params = new URLSearchParams();

    if (query) params.set("q", query);
    if (type !== "all") params.set("type", type);
    if (sort !== "relevance") params.set("sort", sort);
    if (page !== 1) params.set("page", String(page));
    if (verified !== "all") params.set("verified", verified);

    router.push(`/search?${params.toString()}`, { scroll: false });
  }, [type, page, sort, verified, query, router]);

  useEffect(() => {
    const controller = new AbortController();
    const signal = controller.signal;

    const fetchData = async () => {
      setError(null);
      setLoading(true);

      try {
        const params = new URLSearchParams();

        if (query) params.set("q", query);
        if (type !== "all") params.set("type", type);
        if (sort) params.set("sort", sort);
        if (page) params.set("page", String(page));

        params.set("limit", "12");

        if (verified !== "all") params.set("verified", verified);

        const url = `/api/v1/services?${params.toString()}`;
        const res = await fetch(url, { signal });

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }

        const json: GetServicesApiResponse = await res.json();

        const processedServices = json.services.map(service => ({
          ...service,
          updated_at: new Date(service.updated_at),
          createdAt: new Date(service.createdAt),
        }));

        setServices(processedServices || []);
        setPagination(json.pagination || null);
      } catch (err: any) {
        if (err.name === "AbortError") return;
        setError(err.message || "Failed to fetch");
        setServices([]);
        setPagination(null);
      } finally {
        setLoading(false);
        setInitialLoad(false);
      }
    };

    fetchData();
    return () => controller.abort();
  }, [query, type, sort, page, verified]);

  const handleSortChange = (value: string) => {
    setSort(value);
    setPage(1);
  };

  const handleVerifiedChange = (value: string) => {
    setVerified(value);
    setPage(1);
  };

  const handleTypeChange = (value: string) => {
    setType(value);
    setPage(1);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  return {
    query,
    type,
    page,
    sort,
    verified,
    loading,
    services,
    error,
    initialLoad,
    pagination,
    handleSortChange,
    handleVerifiedChange,
    handleTypeChange,
    handlePageChange,
  };
};
