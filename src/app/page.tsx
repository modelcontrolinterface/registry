import { Suspense } from "react";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { Kbd } from "@/components/ui/kbd";
import SearchInput from "@/components/search";
import { Skeleton } from "@/components/ui/skeleton";
import StatsSection from "@/components/stats-section";

const Home = () => {
  return (
    <div className="h-svh flex flex-col items-center justify-center bg-background">
      <div
        className={cn(
          "absolute inset-0",
          "[background-size:40px_40px]",
          "[background-image:linear-gradient(to_right,var(--color-foreground)_1px,transparent_1px),linear-gradient(to_bottom,var(--color-foreground)_1px,transparent_1px)]"
        )}
      />
      <div className="pointer-events-none absolute inset-0 bg-background [mask-image:radial-gradient(ellipse_at_center,transparent_0%,var(--color-background))]"/>

      <div className="z-10 w-full max-w-2xl flex flex-col items-center gap-4 px-8">
        <div className="text-center space-y-4">
          <h1 className="text-5xl md:text-6xl font-semibold text-foreground">
            MCI Registry
          </h1>
          <p className="text-muted-foreground md:text-lg tracking-wide">
            Publish, find, and install all your services
          </p>
        </div>

        <Suspense fallback={<Skeleton className="h-16 w-full rounded-md" />}>
          <SearchInput large />
        </Suspense>

        <Link href="/search">Explore</Link>

        <div className="flex items-center justify-center gap-2 text-muted-foreground">
          <Kbd>/</Kbd>
          <span>to quick search</span>
        </div>

        <Suspense fallback={
          <div className="z-10 w-full flex items-center justify-center sm:justify-between gap-8 mt-8 px-4">
            <Skeleton className="h-16 w-1/3 rounded-md" />
            <Skeleton className="h-16 w-1/3 rounded-md" />
            <Skeleton className="h-16 w-1/3 rounded-md" />
          </div>
        }>
          <StatsSection />
        </Suspense>
      </div>
    </div>
  );
};

export default Home;
