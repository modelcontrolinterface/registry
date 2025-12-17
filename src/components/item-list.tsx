"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Pagination from "@/components/pagination";
import PackageCard from "@/components/package-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { GetUserResult } from "@/app/api/v1/users/[id]/route";

type Package = GetUserResult["owned"]["package"][number];

interface ItemListProps {
  sort: string;
  page: number;
  total: number;
  items: Package[];
  loading: boolean;
  totalPages: number;
  onSortChange: (newSort: string) => void;
  onPageChange: (newPage: number) => void;
}

const ItemList = ({
  items,
  sort,
  loading,
  onSortChange,
  page,
  onPageChange,
  totalPages,
  total,
}: ItemListProps) => {
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 my-6">
        {[...Array(6)].map((_, i) => (
          <Skeleton key={i} className="w-full h-48 rounded-xl" />
        ))}
      </div>
    );
  }

  if (total === 0) {
    return (
      <>
        <div className="flex justify-between items-center gap-2 mb-4">
          <span className="text-lg">0 items</span>
          <Select value={sort} onValueChange={onSortChange}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recent">Recently Updated</SelectItem>
              <SelectItem value="downloads">Most Downloads</SelectItem>
              <SelectItem value="name">Name</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Separator className="my-4" />
        <div className="col-span-full text-center text-muted-foreground py-12">
          No services found.
        </div>
      </>
    );
  }

  return (
    <>
      <div className="flex justify-between items-center gap-2 mb-4">
        <span className="text-lg">
          {total} {total === 1 ? "service" : "services"} (Page {page} of{" "}
          {totalPages})
        </span>

        <Select value={sort} onValueChange={onSortChange}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="recent">Recently Updated</SelectItem>
            <SelectItem value="downloads">Most Downloads</SelectItem>
            <SelectItem value="name">Name</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Separator className="my-4" />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 my-6">
        {items.map((item) => (
          <PackageCard key={item.id} {...item} />
        ))}
      </div>

      <div className="flex justify-center mt-6">
        <Pagination
          page={page}
          totalPages={totalPages}
          onPageChange={onPageChange}
        />
      </div>
    </>
  );
};

export default ItemList;
