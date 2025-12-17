import { safeNumber } from "@/lib/utils";
import { NextResponse } from "next/server";
import { packages, users } from "@/db/schema";
import { createDrizzleSupabaseClient } from "@/lib/drizzle";
import { and, asc, desc, eq, ilike, or, sql } from "drizzle-orm";

export type GetPackagesResult = Awaited<ReturnType<typeof getPackages>>;

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface Filters {
  query: string | null;
  sort: string;
  verified: string;
  type: string | null;
  owner: string | null;
  contributor: string | null;
}

export interface GetPackagesApiResponse {
  packages: GetPackagesResult["packages"];
  pagination: Pagination;
  filters: Filters;
}

const getPackages = async (
  q: string | null,
  sort: string,
  page: number,
  limit: number,
  verified: string,
  type: string | null,
  owner: string | null,
  contributor: string | null,
) => {
  const { rls } = await createDrizzleSupabaseClient();
  const qTerm = q?.trim();
  const ownerTerm = owner?.trim();
  const contributorTerm = contributor?.trim();
  const where = and(
    qTerm
      ? or(
          ilike(packages.id, `%${qTerm}%`),
          ilike(packages.name, `%${qTerm}%`),
          ilike(packages.description, `%${qTerm}%`),
          sql`ARRAY_TO_STRING(keywords, ' ') ILIKE ${`%${qTerm}%`}`,
        )
      : undefined,
    verified === "verified"
      ? eq(packages.is_verified, true)
      : verified === "unverified"
        ? eq(packages.is_verified, false)
        : undefined,
    type &&
      type !== "all" &&
      ["server", "sandbox", "interceptor"].includes(type)
      ? sql`${packages.categories} @> ARRAY[${type}]::package_category[]`
      : undefined,
    ownerTerm ? or(ilike(users.display_name, ownerTerm)) : undefined,
    contributorTerm ? undefined : undefined,
  );
  let queryBuilder = rls((db) => {
    let baseQuery = db
      .select({
        id: packages.id,
        name: packages.name,
        description: packages.description,
        default_version: packages.default_version,
        categories: packages.categories,
        is_verified: packages.is_verified,
        downloads: sql<number>`0`.as("downloads"),
        updated_at: packages.updated_at,
        createdAt: packages.created_at,
        keywords: packages.keywords,
        owners: sql<string[]>`ARRAY[]::text[]`.as("owners"),
        contributors: sql<string[]>`ARRAY[]::text[]`.as("contributors"),
      })
      .from(packages)
      .leftJoin(users, eq(packages.primary_owner, users.id))
      .where(where);

    switch (sort) {
      case "downloads":
        baseQuery = baseQuery.orderBy(desc(packages.downloads));
        break;
      case "newest":
        baseQuery = baseQuery.orderBy(desc(packages.created_at));
        break;
      case "oldest":
        baseQuery = baseQuery.orderBy(asc(packages.created_at));
        break;
      case "name-asc":
        baseQuery = baseQuery.orderBy(asc(packages.name));
        break;
      case "name-desc":
        baseQuery = baseQuery.orderBy(desc(packages.name));
        break;
      case "updated":
        baseQuery = baseQuery.orderBy(desc(packages.updated_at));
        break;
      case "relevance":
      default:
        baseQuery = baseQuery.orderBy(
          desc(packages.is_verified),
          desc(packages.downloads),
          desc(packages.updated_at),
        );
        break;
    }
    return baseQuery;
  });

  const [total, results] = await Promise.all([
    rls((db) =>
      db
        .select({ count: sql<number>`count(*)` })
        .from(packages)
        .where(where),
    ),
    queryBuilder,
  ]);

  return {
    packages: results,
    total: total[0].count,
  };
};

export const GET = async (request: Request) => {
  try {
    const { searchParams } = new URL(request.url);

    const q = searchParams.get("q");
    const type = searchParams.get("type");
    const owner = searchParams.get("owner");
    const page = searchParams.get("page") || "1";
    const limit = searchParams.get("limit") || "20";
    const pageNum = Math.max(1, safeNumber(page, 1));
    const contributor = searchParams.get("contributor");
    const sort = searchParams.get("sort") || "relevance";
    const verified = searchParams.get("verified") || "all";
    const limitNum = Math.min(100, Math.max(1, safeNumber(limit, 20)));

    const { packages, total } = await getPackages(
      q,
      sort,
      pageNum,
      limitNum,
      verified,
      type,
      owner,
      contributor,
    );

    const totalPages = Math.max(1, Math.ceil(total / limitNum));
    const hasNextPage = pageNum < totalPages;
    const hasPrevPage = pageNum > 1;

    return NextResponse.json(
      {
        packages,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages,
          hasNextPage,
          hasPrevPage,
        },
        filters: {
          query: q || null,
          sort,
          verified,
          type: type ?? "all",
          owner: owner || null,
          contributor: contributor || null,
        },
      },
      { status: 200 },
    );
  } catch (err: any) {
    console.error("Error in /api/packages:", err);
    return NextResponse.json(
      { message: "Internal server error", error: String(err) },
      { status: 500 },
    );
  }
};

export const POST = async (request: Request) => {
  try {
    const { rls, supabase } = await createDrizzleSupabaseClient();
    const {
      id,
      name,
      categories,
      description,
      homepage,
      repository,
      keywords,
    } = await request.json();

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const newPackage = await rls((db) =>
      db
        .insert(packages)
        .values({
          id,
          name,
          categories,
          description,
          homepage,
          repository,
          keywords,
          primary_owner: userData.user.id,
        })
        .returning(),
    );

    return NextResponse.json(newPackage[0], { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { message: "Internal server error", error: String(err) },
      { status: 500 },
    );
  }
};
