"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";

import ItemList from "@/components/item-list";
import { Skeleton } from "@/components/ui/skeleton";
import { GetUserResult } from "@/app/api/v1/user-by-username/[username]/route";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type UserApiResponse = GetUserResult;
type UserProfile = GetUserResult["user"];
type ServicesData = GetUserResult["owned"];

const ProfilePage = () => {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();

  const username = params.username as string;

  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState(searchParams.get("tab") || "owned");
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  const [ownedData, setOwnedData] = useState<ServicesData | null>(null);
  const [ownedSort, setOwnedSort] = useState(searchParams.get("ownedSort") || "recent");
  const [ownedPage, setOwnedPage] = useState(Number(searchParams.get("ownedPage")) || 1);

  const [contributedData, setContributedData] = useState<ServicesData | null>(null);
  const [contributedSort, setContributedSort] = useState(searchParams.get("contributedSort") || "recent");
  const [contributedPage, setContributedPage] = useState(Number(searchParams.get("contributedPage")) || 1);

  useEffect(() => {
    const loadUserData = async () => {
      setLoading(true);

      try {
        const params = new URLSearchParams({
          ownedSort,
          ownedLimit: "12",
          contributedSort,
          contributedLimit: "12",
          ownedPage: ownedPage.toString(),
          contributedPage: contributedPage.toString(),
        });

        const res = await fetch(`/api/v1/user-by-username/${username}?${params.toString()}`);

        if (!res.ok) {
          console.warn(`User profile for ${username} not found. Status: ${res.status}`);
          setUserProfile(null);
          return;
        }

        const data: UserApiResponse = await res.json();
        setOwnedData(data.owned);
        setUserProfile(data.user);
        setContributedData(data.contributed);
      } catch (error) {
        console.error("Error fetching user data:", error);
        setUserProfile(null);
      } finally {
        setLoading(false);
      }
    };

    loadUserData();
  }, [username, ownedSort, ownedPage, contributedSort, contributedPage]);

  useEffect(() => {
    const params = new URLSearchParams();

    if (tab !== "owned") params.set("tab", tab);

    if (tab === "owned") {
      if (ownedSort !== "recent") params.set("ownedSort", ownedSort);
      if (ownedPage !== 1) params.set("ownedPage", ownedPage.toString());
    } else {
      if (contributedSort !== "recent")
        params.set("contributedSort", contributedSort);
      if (contributedPage !== 1)
        params.set("contributedPage", contributedPage.toString());
    }

    const queryString = params.toString();
    const newUrl = queryString ? `/user/${username}?${queryString}` : `/user/${username}`;

    router.push(newUrl, { scroll: false });
  }, [tab, ownedSort, ownedPage, contributedSort, contributedPage, username, router]);

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

        <div className="flex gap-4 mb-4">
          <Skeleton className="w-32 h-10 rounded" />
          <Skeleton className="w-32 h-10 rounded" />
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
          The profile for {username} could not be loaded or does not exist.
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
          <p className="text-muted-foreground">@{userProfile.username}</p>
        </div>
      </div>

      <Tabs
        value={tab}
        onValueChange={(newTab) => {
          setTab(newTab);
        }}
      >
        <TabsList>
          <TabsTrigger value="owned">Owned</TabsTrigger>
          <TabsTrigger value="contributed">Contributed</TabsTrigger>
        </TabsList>

        <TabsContent value="owned">
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
        </TabsContent>

        <TabsContent value="contributed">
          <ItemList
            items={contributedData?.services || []}
            sort={contributedSort}
            loading={loading}
            onSortChange={(v) => {
              setContributedSort(v);
              setContributedPage(1);
            }}
            page={contributedPage}
            onPageChange={setContributedPage}
            totalPages={contributedData?.pagination.totalPages || 1}
            total={contributedData?.pagination.total || 0}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ProfilePage;
