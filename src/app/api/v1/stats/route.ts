import { count, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { packages, package_versions } from "@/db/schema";
import { createDrizzleSupabaseClient } from "@/lib/drizzle";

export type RegistryStats = {
  packages: number;
  releases: number;
  downloads: number;
};

export const GET = async () => {
  try {
    const { rls } = await createDrizzleSupabaseClient();
    const [packagesCount, releasesCount, downloadsSum] = await Promise.all([
      rls((db) => db.select({ value: count() }).from(packages)),
      rls((db) => db.select({ value: count() }).from(package_versions)),
      rls((db) =>
        db
          .select({ value: sql<number>`sum(${package_versions.downloads})` })
          .from(package_versions),
      ),
    ]);

    const stats: RegistryStats = {
      packages: packagesCount[0].value,
      releases: releasesCount[0].value,
      downloads: downloadsSum[0].value ?? 0,
    };

    return NextResponse.json(stats, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      { message: "Internal server error", error: String(err) },
      { status: 500 },
    );
  }
};
