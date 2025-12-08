import { Skeleton } from "@/components/ui/skeleton";

const ServiceCardSkeleton = () => (
  <div className="flex flex-col space-y-3 border rounded-md p-4">
    <div className="flex items-center space-x-4">
      <Skeleton className="h-12 w-12 rounded-full" />
      <div className="space-y-2 flex-1">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </div>
    </div>
    <div className="space-y-2 pt-2">
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-[90%]" />
      <Skeleton className="h-4 w-[70%]" />
    </div>
    <div className="flex justify-between pt-4">
      <Skeleton className="h-5 w-[100px]" />
      <Skeleton className="h-5 w-[80px]" />
    </div>
  </div>
);

export default ServiceCardSkeleton;
