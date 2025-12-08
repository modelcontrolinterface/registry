import { NextResponse } from "next/server";
import { safeNumber } from "@/lib/utils";
import { services, users } from "@/db/schema";
import { createDrizzleSupabaseClient } from "@/lib/drizzle";
import { and, asc, desc, eq, ilike, or, sql } from "drizzle-orm";

export type GetServicesResult = Awaited<ReturnType<typeof getServices>>;

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

export interface GetServicesApiResponse {
  services: GetServicesResult["services"];
  pagination: Pagination;
  filters: Filters;
}

const getServices = async (
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
          ilike(services.id, `%${qTerm}%`),
          ilike(services.name, `%${qTerm}%`),
          ilike(services.description, `%${qTerm}%`),
          sql`ARRAY_TO_STRING(keywords, ' ') ILIKE ${`%${qTerm}%`}`,
        )
      : undefined,
    verified === "verified"
      ? eq(services.is_verified, true)
      : verified === "unverified"
        ? eq(services.is_verified, false)
        : undefined,
    type &&
      type !== "all" &&
      ["server", "sandbox", "interceptor"].includes(type)
      ? eq(services.type, type as "server" | "sandbox" | "interceptor")
      : undefined,
    ownerTerm
      ? or(
          ilike(users.username, ownerTerm),
          ilike(users.display_name, ownerTerm),
        )
      : undefined,
    contributorTerm ? ilike(users.username, contributorTerm) : undefined,
  );
  const query = rls((db) =>
    db
      .select({
        id: services.id,
        name: services.name,
        description: services.description,
        default_version: services.default_version,
        type: services.type,
        is_verified: services.is_verified,
        downloads: sql<number>`0`.as("downloads"),
        updated_at: services.updated_at,
        createdAt: services.created_at,
        keywords: services.keywords,
        owners: sql<string[]>`ARRAY[]::text[]`.as("owners"),
        contributors: sql<string[]>`ARRAY[]::text[]`.as("contributors"),
      })
      .from(services)
      .leftJoin(users, eq(services.primary_owner, users.id))
      .where(where),
  );

  // build order by clause
  switch (sort) {
    case "downloads":
      // query = query.orderBy(desc(services.downloads));
      break;
    case "newest":
      // query = query.orderBy(desc(services.created_at));
      break;
    case "oldest":
      // query = query.orderBy(asc(services.created_at));
      break;
    case "name-asc":
      // query = query.orderBy(asc(services.name));
      break;
    case "name-desc":
      // query = query.orderBy(desc(services.name));
      break;
    case "updated":
      // query = query.orderBy(desc(services.updated_at));
      break;
    case "relevance":
    default:
      // query = query.orderBy(
      //   desc(services.is_verified),
      //   // desc(services.downloads),
      //   desc(services.updated_at),
      // );
      break;
  }

  const [total, results] = await Promise.all([
    rls((db) =>
      db
        .select({ count: sql<number>`count(*)` })
        .from(services)
        .where(where),
    ),
    query,
  ]);

  return {
    services: results,
    total: total[0].count,
  };
};

export const GET = async (request: Request) => {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q");
    const sort = searchParams.get("sort") || "relevance";
    const page = searchParams.get("page") || "1";
    const limit = searchParams.get("limit") || "20";
    const verified = searchParams.get("verified") || "all";
    const type = searchParams.get("type");
    const owner = searchParams.get("owner");
    const contributor = searchParams.get("contributor");

    const pageNum = Math.max(1, safeNumber(page, 1));
    const limitNum = Math.min(100, Math.max(1, safeNumber(limit, 20)));

    const { services, total } = await getServices(
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
        services,
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
    console.error("Error in /api/services:", err);
    return NextResponse.json(
      { message: "Internal server error", error: String(err) },
      { status: 500 },
    );
  }
};

export const POST = async (request: Request) => {
  try {
    const { rls, supabase } = await createDrizzleSupabaseClient();
    const { id, name, type, description, homepage, repository, keywords } =
      await request.json();

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const newService = await rls((db) =>
      db
        .insert(services)
        .values({
          id,
          name,
          type,
          description,
          homepage,
          repository,
          keywords,
          primary_owner: userData.user.id,
        })
        .returning(),
    );

    return NextResponse.json(newService[0], { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { message: "Internal server error", error: String(err) },
      { status: 500 },
    );
  }
};
