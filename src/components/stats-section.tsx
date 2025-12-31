"use client"

import useSWR from "swr";
import { Skeleton } from "@/components/ui/skeleton";
import type { RegistryStats } from "@/app/api/v1/stats/route";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export const StatsSectionSkeleton = () => {
  return (
    <div className="z-10 w-full flex items-center justify-center sm:justify-between gap-8 mt-8 px-4">
      <Skeleton className="h-16 w-1/3 rounded-md" />
      <Skeleton className="h-16 w-1/3 rounded-md" />
      <Skeleton className="h-16 w-1/3 rounded-md" />
    </div>
  )
}

const StatsSection = () => {
  const { data: stats, error, isLoading } = useSWR<RegistryStats>("/api/v1/stats", fetcher);

  if (isLoading || !stats) {
    return <StatsSectionSkeleton />
  }

  if (error) {
    return <></>;
  }

  return (
    <div className="z-10 w-full flex items-center justify-center sm:justify-between gap-8 mt-8 px-4">
      <div className="flex flex-col items-center text-center">
        <span className="text-2xl sm:text-3xl font-bold text-foreground">
          {stats.packages.toLocaleString()}
        </span>
        <span className="text-muted-foreground">Packages</span>
      </div>

      <div className="flex flex-col items-center text-center">
        <span className="text-2xl sm:text-3xl font-bold text-foreground">
          {stats?.downloads.toLocaleString()}
        </span>
        <span className="text-muted-foreground">Downloads</span>
      </div>

      <div className="flex flex-col items-center text-center">
        <span className="text-2xl sm:text-3xl font-bold text-foreground">
          {stats?.releases.toLocaleString()}
        </span>
        <span className="text-muted-foreground">Releases</span>
      </div>
    </div>
  );
};

export default StatsSection;
