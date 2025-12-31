"use client";

import { Suspense } from "react";
import PackageList, { PackageListSkeleton } from "@/components/package-list";

const SearchPage = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <Suspense fallback={<PackageListSkeleton />}>
        <PackageList />
      </Suspense>
    </div>
  );
};

export default SearchPage;
