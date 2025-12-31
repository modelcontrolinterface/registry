"use client";

import { useParams } from "next/navigation";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";

import Image from "next/image";
import { Skeleton } from "@/components/ui/skeleton";
import PackageList from "@/components/package-list";
import { GetUserResult } from "@/app/api/v1/users/[id]/route";

type UserApiResponse = GetUserResult;

const ProfilePage = () => {
  const params = useParams();
  const id = params.id as string;

  const { data, error, isLoading } = useSWR<UserApiResponse>(
    id ? `/api/v1/users/${id}` : null,
    fetcher
  );

  const userProfile = data?.user;

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Skeleton className="w-16 h-16 rounded-full" />
          <div className="flex flex-col gap-2">
            <Skeleton className="w-48 h-6" />
            <Skeleton className="w-32 h-4" />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="w-full h-48 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !userProfile) {
    return (
      <div className="container mx-auto px-4 py-32 text-center">
        <h1 className="text-2xl font-bold mb-4">User Not Found</h1>
        <p className="text-muted-foreground">
          The profile for {id} could not be loaded or does not exist.
        </p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center gap-4 mb-4">
        <Image
          width={64}
          height={64}
          alt={userProfile.display_name}
          className="w-16 h-16 rounded-full"
          src={userProfile.avatar_url || "https://i.pravatar.cc/150?img=5"}
        />
        <div>
          <h1 className="text-2xl font-bold">{userProfile.display_name}</h1>
        </div>
      </div>
      <PackageList ownerId={id} />
    </div>
  );
};

export default ProfilePage;

