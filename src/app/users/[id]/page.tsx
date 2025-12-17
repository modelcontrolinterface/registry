"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";

import ItemList from "@/components/item-list";
import { Skeleton } from "@/components/ui/skeleton";
import { GetUserResult } from "@/app/api/v1/users/[id]/route";

type UserApiResponse = GetUserResult;
type UserProfile = GetUserResult["user"];
type ServicesData = GetUserResult["owned"];

const ProfilePage = () => {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();

  const id = params.id as string;

  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  const [ownedData, setOwnedData] = useState<ServicesData | null>(null);
  const [ownedSort, setOwnedSort] = useState(searchParams.get("ownedSort") || "recent");
  const [ownedPage, setOwnedPage] = useState(Number(searchParams.get("ownedPage")) || 1);

  useEffect(() => {
    const loadUserData = async () => {
      setLoading(true);

      try {
        const params = new URLSearchParams({
          ownedSort,
          ownedLimit: "12",
          ownedPage: ownedPage.toString(),
        });

        const res = await fetch(`/api/v1/users/${id}?${params.toString()}`);

        if (!res.ok) {
          console.warn(`User profile for ${id} not found. Status: ${res.status}`);
          setUserProfile(null);
          return;
        }

        const data: UserApiResponse = await res.json();
        setOwnedData(data.owned);
        setUserProfile(data.user);
      } catch (error) {
        console.error("Error fetching user data:", error);
        setUserProfile(null);
      } finally {
        setLoading(false);
      }
    };

    loadUserData();
  }, [id, ownedSort, ownedPage]);

  if (loading) {
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

  if (!userProfile) {
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
        <img
          src={userProfile.avatar_url || "https://i.pravatar.cc/150?img=5"}
          alt={userProfile.display_name}
          className="w-16 h-16 rounded-full"
        />
        <div>
          <h1 className="text-2xl font-bold">{userProfile.display_name}</h1>

        </div>
      </div>

      <ItemList
        items={ownedData?.services || []}
        sort={ownedSort}
        loading={loading}
        onSortChange={(v) => {
          setOwnedSort(v);
          setOwnedPage(1);
        }}
        page={ownedPage}
        onPageChange={setOwnedPage}
        totalPages={ownedData?.pagination.totalPages || 1}
        total={ownedData?.pagination.total || 0}
      />
    </div>
  );
};

export default ProfilePage;