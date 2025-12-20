import { z } from "zod";
import { safeNumber } from "@/lib/utils";
import { NextResponse } from "next/server";
import { packages, users, package_versions, package_owners } from "@/db/schema";
import { createDrizzleSupabaseClient } from "@/lib/drizzle";
import { and, asc, desc, eq, ilike, or, sql, Column, SQL } from "drizzle-orm";
import { PgColumn } from "drizzle-orm/pg-core";

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
  sort: string;
  verified: string;
  type: string | null;
  query: string | null;
  owner: string | null;
  contributor: string | null;
}

export interface GetPackagesApiResponse {
  filters: Filters;
  pagination: Pagination;
  packages: GetPackagesResult["packages"];
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
    contributorTerm
      ? sql`EXISTS (
          SELECT 1
          FROM package_versions pv
          JOIN users u ON pv.publisher_id = u.id
          WHERE pv.package_id = ${packages.id} AND u.display_name ILIKE ${`%${contributorTerm}%`}
        )`
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

    const secondaryOwners = db
      .select({
        package_id: package_owners.package_id,
        owner_names: sql<string[]>`array_agg(${users.display_name})`.as(
          "owner_names",
        ),
      })
      .from(package_owners)
      .leftJoin(users, eq(package_owners.user_id, users.id))
      .groupBy(package_owners.package_id)
      .as("secondary_owners");

    const contributors = db
      .select({
        package_id: package_versions.package_id,
        contributor_names: sql<
          string[]
        >`array_agg(distinct ${users.display_name})`.as("contributor_names"),
      })
      .from(package_versions)
      .leftJoin(users, eq(package_versions.publisher_id, users.id))
      .groupBy(package_versions.package_id)
      .as("contributors");

    const baseQuery = db
      .select({
        id: packages.id,
        name: packages.name,
        description: packages.description,
        default_version: packages.default_version,
        categories: packages.categories,
        is_verified: packages.is_verified,
        is_deprecated: packages.is_deprecated,
        downloads: sql<number>`coalesce(${downloadCounts.downloads}, 0)`.as(
          "downloads",
        ),
        updated_at: packages.updated_at,
        createdAt: packages.created_at,
        keywords: packages.keywords,
        owners: sql<
          string[]
        >`array_remove(array_cat(ARRAY[${users.display_name}], ${secondaryOwners.owner_names}), NULL)`.as(
          "owners",
        ),
        contributors: sql<
          string[]
        >`coalesce(${contributors.contributor_names}, ARRAY[]::text[])`.as(
          "contributors",
        ),
      })
      .from(packages)
      .leftJoin(users, eq(packages.primary_owner, users.id))
      .leftJoin(downloadCounts, eq(packages.id, downloadCounts.package_id))
      .leftJoin(secondaryOwners, eq(packages.id, secondaryOwners.package_id))
      .leftJoin(contributors, eq(packages.id, contributors.package_id))
      .where(where);

    let orderByClause: (PgColumn | SQL)[];

    switch (sort) {
      case "downloads":
        orderByClause = [desc(sql`downloads`)];
        break;
      case "newest":
        orderByClause = [desc(packages.created_at)];
        break;
      case "oldest":
        orderByClause = [asc(packages.created_at)];
        break;
      case "name-asc":
        orderByClause = [asc(packages.name)];
        break;
      case "name-desc":
        orderByClause = [desc(packages.name)];
        break;
      case "updated":
        orderByClause = [desc(packages.updated_at)];
        break;
      case "relevance":
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
        .leftJoin(users, eq(packages.primary_owner, users.id))
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
  } catch (err: unknown) {
    return NextResponse.json(
      { message: "Internal server error", error: String(err) },
      { status: 500 },
    );
  }
};

const packageCategoryEnum = z.enum(["server", "sandbox", "interceptor"]);

const createPackageSchema = z.object({
  id: z.string().min(1, "Package ID is required"),
  name: z.string().min(1, "Package name is required"),
  categories: z.array(packageCategoryEnum).min(1, "At least one category is required"),
  description: z.string().optional(),
  homepage: z.string().url("Homepage must be a valid URL").optional(),
  repository: z.string().url("Repository must be a valid URL").optional(),
  keywords: z.array(z.string()).optional(),
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
      categories,
      description,
      homepage,
      repository,
      keywords,
    } = validation.data;

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Check if package ID already exists
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
  } catch (err: unknown) {
    return NextResponse.json(
      { message: "Internal server error", error: String(err) },
      { status: 500 },
    );
  }
};
