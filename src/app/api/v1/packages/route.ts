import { z } from "zod";
import { safeNumber } from "@/lib/utils";
import { NextResponse } from "next/server";
import { Pagination } from "@/lib/interfaces";
import { PgColumn } from "drizzle-orm/pg-core";
import { packageNameRegex } from "@/lib/regex";
import { createDrizzleSupabaseClient } from "@/lib/drizzle";
import { packages, users, package_versions } from "@/db/schema";
import { and, asc, desc, eq, ilike, or, sql, SQL } from "drizzle-orm";
import {
  PackageSort,
  PackageVerified,
  PackageCategory,
  PackageDeprecated,
} from "@/lib/enums";

export type GetPackagesResult = Awaited<ReturnType<typeof getPackages>>;

export interface PackageFilters {
  sort: PackageSort;
  query: string | null;
  owner: string | null;
  verified: PackageVerified;
  deprecated: PackageDeprecated;
  category: PackageCategory | null;
}

export interface GetPackagesApiResponse {
  filters: PackageFilters;
  pagination: Pagination;
  packages: GetPackagesResult["packages"];
}

const getPackages = async (
  q: string | null,
  sort: PackageSort,
  page: number,
  limit: number,
  ownerId: string | null,
  verified: PackageVerified,
  deprecated: PackageDeprecated,
  category: PackageCategory | null,
) => {
  const { rls } = await createDrizzleSupabaseClient();
  const qTerm = q?.trim();
  const where = and(
    qTerm
      ? or(
          ilike(packages.name, `%${qTerm}%`),
          ilike(packages.description, `%${qTerm}%`),
          sql`ARRAY_TO_STRING(keywords, ' ') ILIKE ${`%${qTerm}%`}`,
        )
      : undefined,
    verified === PackageVerified.Verified
      ? eq(packages.is_verified, true)
      : verified === PackageVerified.Unverified
        ? eq(packages.is_verified, false)
        : undefined,
    deprecated === PackageDeprecated.Deprecated
      ? eq(packages.is_deprecated, true)
      : deprecated === PackageDeprecated.NotDeprecated
        ? eq(packages.is_deprecated, false)
        : undefined,
    category && category !== PackageCategory.All
      ? sql`${packages.categories} @> ARRAY[${category}]::package_category[]`
      : undefined,
    ownerId
      ? or(
          eq(packages.primary_owner_id, ownerId),
          sql`EXISTS (
            SELECT 1
            FROM package_owners po
            WHERE po.package_id = ${packages.id} AND po.user_id = ${ownerId}
          )`,
        )
      : undefined,
  );
  const queryBuilder = rls((db) => {
    const downloadCounts = db
      .select({
        package_id: package_versions.package_id,
        downloads: sql<number>`sum(${package_versions.downloads})`
          .mapWith(Number)
          .as("downloads"),
      })
      .from(package_versions)
      .groupBy(package_versions.package_id)
      .as("download_counts");
    const baseQuery = db
      .select({
        id: packages.id,
        name: packages.name,
        description: packages.description,
        categories: packages.categories,
        keywords: packages.keywords,
        default_version: packages.default_version,
        is_verified: packages.is_verified,
        is_deprecated: packages.is_deprecated,
        downloads: sql<number>`coalesce(${downloadCounts.downloads}, 0)`.as(
          "downloads",
        ),
        updated_at: packages.updated_at,
        createdAt: packages.created_at,
      })
      .from(packages)
      .leftJoin(users, eq(packages.primary_owner_id, users.id))
      .leftJoin(downloadCounts, eq(packages.id, downloadCounts.package_id))
      .where(where);

    let orderByClause: (PgColumn | SQL)[];

    switch (sort) {
      case PackageSort.Downloads:
        orderByClause = [desc(sql`downloads`)];
        break;
      case PackageSort.Newest:
        orderByClause = [desc(packages.created_at)];
        break;
      case PackageSort.Oldest:
        orderByClause = [asc(packages.created_at)];
        break;
      case PackageSort.NameAsc:
        orderByClause = [asc(packages.name)];
        break;
      case PackageSort.NameDesc:
        orderByClause = [desc(packages.name)];
        break;
      case PackageSort.Updated:
        orderByClause = [desc(packages.updated_at)];
        break;
      case PackageSort.Relevance:
      default:
        orderByClause = [desc(packages.is_verified), desc(packages.updated_at)];
        break;
    }

    return baseQuery
      .orderBy(...orderByClause)
      .limit(limit)
      .offset((page - 1) * limit);
  });

  const [total, results] = await Promise.all([
    rls((db) =>
      db
        .select({ count: sql<number>`count(*)` })
        .from(packages)
        .leftJoin(users, eq(packages.primary_owner_id, users.id))
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
    const ownerId = searchParams.get("owner");
    const page = searchParams.get("page") || "1";
    const category = searchParams.get("category");
    const limit = searchParams.get("limit") || "20";
    const pageNum = Math.max(1, safeNumber(page, 1));
    const sort = searchParams.get("sort") || PackageSort.Relevance;
    const limitNum = Math.min(100, Math.max(1, safeNumber(limit, 20)));
    const verified = searchParams.get("verified") || PackageVerified.All;
    const deprecated = searchParams.get("deprecated") || PackageDeprecated.All;

    const sortValue = Object.values(PackageSort).includes(sort as PackageSort)
      ? (sort as PackageSort)
      : PackageSort.Relevance;
    const verifiedValue = Object.values(PackageVerified).includes(
      verified as PackageVerified,
    )
      ? (verified as PackageVerified)
      : PackageVerified.All;
    const deprecatedValue = Object.values(PackageDeprecated).includes(
      deprecated as PackageDeprecated,
    )
      ? (deprecated as PackageDeprecated)
      : PackageDeprecated.All;
    const categoryValue =
      category &&
      Object.values(PackageCategory).includes(category as PackageCategory)
        ? (category as PackageCategory)
        : null;

    const { packages, total } = await getPackages(
      q,
      sortValue,
      pageNum,
      limitNum,
      ownerId,
      verifiedValue,
      deprecatedValue,
      categoryValue,
    );

    const totalPages = Math.max(1, Math.ceil(total / limitNum));
    const hasNextPage = pageNum < totalPages;
    const hasPrevPage = pageNum > 1;

    return NextResponse.json(
      {
        packages,
        filters: {
          query: q || null,
          sort: sortValue,
          verified: verifiedValue,
          deprecated: deprecatedValue,
          category: categoryValue,
          owner: ownerId || null,
        },
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          total_pages: totalPages,
          has_next_page: hasNextPage,
          has_prev_page: hasPrevPage,
        },
      },
      { status: 200 },
    );
  } catch (err: unknown) {
    return NextResponse.json(
      { message: "Internal server error", error: String(err) },
      { status: 500 },
    );
  }
};

const packageCategoryEnum = z.enum([
  "hook",
  "server",
  "sandbox",
  "interceptor",
]);

const createPackageSchema = z.object({
  id: z
    .string()
    .min(3, "Package ID must be at least 3 characters long")
    .max(64, "Package ID must be at most 64 characters long")
    .regex(packageNameRegex, "Invalid package ID format"),
  name: z
    .string()
    .min(3, "Package name must be at least 3 characters long")
    .max(64, "Package name must be at most 64 characters long"),
  categories: z
    .array(packageCategoryEnum)
    .min(1, "At least one category is required")
    .max(4, "You can select up to 4 categories"),
  description: z
    .string()
    .max(500, "Description must be at most 500 characters long"),
  homepage: z.url("Homepage must be a valid URL").optional(),
  repository: z.url("Repository must be a valid URL").optional(),
  keywords: z
    .array(
      z.string().max(64, "Each keyword must be at most 64 characters long"),
    )
    .max(5, "You can have up to 5 keywords"),
});

export const POST = async (request: Request) => {
  try {
    const { rls, supabase } = await createDrizzleSupabaseClient();
    const body = await request.json();

    const validation = createPackageSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { message: "Invalid request body", errors: validation.error.issues },
        { status: 400 },
      );
    }

    const {
      id,
      name,
      description,
      categories,
      keywords,
      homepage,
      repository,
    } = validation.data;

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const existingPackage = await rls((db) =>
      db.query.packages.findFirst({
        where: eq(packages.id, id),
      }),
    );

    if (existingPackage) {
      return NextResponse.json(
        { message: `Package with ID '${id}' already exists` },
        { status: 409 },
      );
    }

    const newPackage = await rls((db) =>
      db
        .insert(packages)
        .values({
          id,
          name,
          description,
          categories,
          keywords,
          homepage: homepage ?? null,
          repository: repository ?? null,
          primary_owner_id: userData.user.id,
        })
        .returning(),
    );

    return NextResponse.json(newPackage[0], { status: 201 });
  } catch (err: unknown) {
    return NextResponse.json(
      { message: "Internal server error", error: String(err) },
      { status: 500 },
    );
  }
};
