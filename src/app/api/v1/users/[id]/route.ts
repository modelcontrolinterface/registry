import { eq, desc, sql, getTableColumns } from "drizzle-orm";
import * as schema from "@/db/schema";
import { users, packages, package_versions } from "@/db/schema";
import { NextRequest, NextResponse } from "next/server";
import { createDrizzleSupabaseClient } from "@/lib/drizzle";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";

type DbClient = PostgresJsDatabase<typeof schema>;

interface OwnedPackagesData {
  packages: (typeof packages.$inferSelect & { downloads: number })[];
  pagination: {
    total: number;
    totalPages: number;
  };
}

interface GetUserReturn {
  user: typeof users.$inferSelect;
  owned: OwnedPackagesData;
}

export type GetUserResult = GetUserReturn | null;

const getUser = async (
  db: DbClient,
  id: string,
): Promise<GetUserReturn | null> => {
  const user = await db.query.users.findFirst({
    where: eq(users.id, id),
  });

  if (!user) {
    return null;
  }

  const ownedPackages = await db
    .select({
      ...getTableColumns(packages),
      downloads: sql<number>`coalesce(sum(${package_versions.downloads}), 0)`.as(
        "downloads",
      ),
    })
    .from(packages)
    .leftJoin(package_versions, eq(packages.id, package_versions.package_id))
    .where(eq(packages.primary_owner, user.id))
    .groupBy(...Object.values(getTableColumns(packages)))
    .orderBy(desc(packages.created_at));

  return {
    user,
    owned: {
      packages: ownedPackages,
      pagination: {
        total: ownedPackages.length,
        totalPages: 1,
      },
    },
  };
};

export async function GET(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { rls } = await createDrizzleSupabaseClient();
  const user = await rls((db) => getUser(db, id));

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json(user);
}
