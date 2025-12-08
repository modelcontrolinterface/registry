import * as schema from "@/db/schema";
import { createDrizzleSupabaseClient } from "@/lib/drizzle";
import { and, asc, desc, eq, or, sql, count } from "drizzle-orm";
import { NextResponse } from "next/server";
import { safeNumber } from "@/lib/utils";

export type GetUserResult = Awaited<ReturnType<typeof getUser>>;

const isServiceType = (
  value: string | null,
): value is "server" | "sandbox" | "interceptor" =>
  value === "server" || value === "sandbox" || value === "interceptor";

const getServices = async (
  db: any,
  sort: string,
  page: number,
  limit: number,
  userId: string,
  type: string | null,
  verified: string | null,
  userRelation: "owned" | "contributed",
) => {
  const serviceType = isServiceType(type) ? type : null;
  const where = and(
    userRelation === "owned"
      ? or(
          eq(schema.services.primary_owner, userId),
          eq(schema.service_owners.user_id, userId),
        )
      : eq(schema.service_version_contributors.user_id, userId),
    serviceType ? eq(schema.services.type, serviceType) : undefined,
    verified === "verified"
      ? eq(schema.services.is_verified, true)
      : verified === "unverified"
        ? eq(schema.services.is_verified, false)
        : undefined,
  );

  const query = db
    .select({
      id: schema.services.id,
      name: schema.services.name,
      description: schema.services.description,
      default_version: schema.services.default_version,
      type: schema.services.type,
      is_verified: schema.services.is_verified,
      downloads: sql<number>`0`.as("downloads"),
      updated_at: schema.services.updated_at,
      createdAt: schema.services.created_at,
      keywords: schema.services.keywords,
    })
    .from(schema.services)
    .leftJoin(
      schema.service_owners,
      eq(schema.services.id, schema.service_owners.service_id),
    )
    .leftJoin(
      schema.service_version_contributors,
      eq(schema.services.id, schema.service_version_contributors.service_id),
    )
    .where(where)
    .groupBy(schema.services.id);

  switch (sort) {
    case "downloads":
      // query.orderBy(desc(schema.services.downloads));
      break;
    case "recent":
      query.orderBy(desc(schema.services.updated_at));
      break;
    case "name":
      query.orderBy(asc(schema.services.name));
      break;
    default:
      query.orderBy(desc(schema.services.updated_at));
  }

  const [total, services] = await Promise.all([
    db
      .select({ count: count() })
      .from(schema.services)
      .leftJoin(
        schema.service_owners,
        eq(schema.services.id, schema.service_owners.service_id),
      )
      .leftJoin(
        schema.service_version_contributors,
        eq(schema.services.id, schema.service_version_contributors.service_id),
      )
      .where(where),
    query,
  ]);

  return {
    services,
    total: total[0].count,
  };
};

const getUser = async (db: any, username: string) => {
  return db.query.users.findFirst({
    where: eq(schema.users.username, username),
  });
};

export const GET = async (
  request: Request,
  { params }: { params: Promise<{ username: string }> },
) => {
  try {
    const { rls } = await createDrizzleSupabaseClient();
    const { username } = await params;
    const user = await rls((db) => getUser(db, username));

    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);

    const ownedSort = searchParams.get("ownedSort") || "recent";
    const ownedPage = Math.max(1, safeNumber(searchParams.get("ownedPage"), 1));
    const ownedLimit = Math.min(
      100,
      Math.max(1, safeNumber(searchParams.get("ownedLimit"), 12)),
    );
    const ownedType = searchParams.get("ownedType") || "all";
    const ownedVerified = searchParams.get("ownedVerified") || "all";

    const contributedSort = searchParams.get("contributedSort") || "recent";
    const contributedPage = Math.max(
      1,
      safeNumber(searchParams.get("contributedPage"), 1),
    );
    const contributedLimit = Math.min(
      100,
      Math.max(1, safeNumber(searchParams.get("contributedLimit"), 12)),
    );
    const contributedType = searchParams.get("contributedType") || "all";
    const contributedVerified =
      searchParams.get("contributedVerified") || "all";

    const [owned, contributed] = await Promise.all([
      rls((db) =>
        getServices(
          db,
          ownedSort,
          ownedPage,
          ownedLimit,
          user.id,
          ownedType,
          ownedVerified,
          "owned",
        ),
      ),
      rls((db) =>
        getServices(
          db,
          contributedSort,
          contributedPage,
          contributedLimit,
          user.id,
          contributedType,
          contributedVerified,
          "contributed",
        ),
      ),
    ]);

    const ownedTotalPages = Math.max(1, Math.ceil(owned.total / ownedLimit));
    const contributedTotalPages = Math.max(
      1,
      Math.ceil(contributed.total / contributedLimit),
    );

    return NextResponse.json(
      {
        user,
        owned: {
          services: owned.services,
          pagination: {
            page: ownedPage,
            limit: ownedLimit,
            total: owned.total,
            totalPages: ownedTotalPages,
            hasNextPage: ownedPage < ownedTotalPages,
            hasPrevPage: ownedPage > 1,
          },
          filters: {
            sort: ownedSort,
            type: ownedType,
            verified: ownedVerified,
          },
        },
        contributed: {
          services: contributed.services,
          pagination: {
            page: contributedPage,
            limit: contributedLimit,
            total: contributed.total,
            totalPages: contributedTotalPages,
            hasNextPage: contributedPage < contributedTotalPages,
            hasPrevPage: contributedPage > 1,
          },
          filters: {
            sort: contributedSort,
            type: contributedType,
            verified: contributedVerified,
          },
        },
      },
      { status: 200 },
    );
  } catch (err: any) {
    console.error("Error in user profile API:", err);
    return NextResponse.json(
      { message: "Internal server error", error: String(err) },
      { status: 500 },
    );
  }
};
