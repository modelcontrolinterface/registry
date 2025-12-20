"use client"

import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import type { RegistryStats } from '@/app/api/v1/stats/route';

const StatsSection = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<RegistryStats | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/v1/stats');
        if (!response.ok) {
          throw new Error('Failed to fetch statistics');
        }
        const data: RegistryStats = await response.json();
        setStats(data);
      } catch (err) {
        console.error(err);
        setError('Failed to load stats.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (isLoading || !stats) {
    return (
        <div className="z-10 w-full flex items-center justify-center sm:justify-between gap-8 mt-8 px-4">
            <Skeleton className="h-16 w-1/3 rounded-md" />
            <Skeleton className="h-16 w-1/3 rounded-md" />
            <Skeleton className="h-16 w-1/3 rounded-md" />
        </div>
    );
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
