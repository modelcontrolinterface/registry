import { count, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { services, service_versions } from "@/db/schema";
import { createDrizzleSupabaseClient } from "@/lib/drizzle";

export type RegistryStats = {
  services: number;
  releases: number;
  downloads: number;
};

export const GET = async () => {
  try {
    const { rls } = await createDrizzleSupabaseClient();
    const [servicesCount, releasesCount, downloadsSum] = await Promise.all([
      rls((db) => db.select({ value: count() }).from(services)),
      rls((db) => db.select({ value: count() }).from(service_versions)),
      rls((db) =>
        db
          .select({ value: sql<number>`sum(${service_versions.downloads})` })
          .from(service_versions),
      ),
    ]);

    const stats: RegistryStats = {
      services: servicesCount[0].value,
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
