import { z } from "zod";
import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { packages, package_versions } from "@/db/schema";
import { createDrizzleSupabaseClient } from "@/lib/drizzle";

export type GetPackageResult = Awaited<ReturnType<typeof getPackage>>;

// Helper function to compare semantic versions
const compareSemanticVersions = (v1: string, v2: string): number => {
  const parse = (version: string) => {
    const parts = version.split('-');
    const main = parts[0].split('.').map(Number);
    const pre = parts.length > 1 ? parts[1].split('.').filter(Boolean) : [];
    return { main, pre };
  };

  const p1 = parse(v1);
  const p2 = parse(v2);

  for (let i = 0; i < Math.max(p1.main.length, p2.main.length); i++) {
    const n1 = p1.main[i] || 0;
    const n2 = p2.main[i] || 0;
    if (n1 !== n2) return n1 - n2;
  }

  if (p1.pre.length === 0 && p2.pre.length === 0) return 0;
  if (p1.pre.length === 0) return 1; // Stable version is greater than pre-release
  if (p2.pre.length === 0) return -1; // Pre-release is less than stable version

  for (let i = 0; i < Math.max(p1.pre.length, p2.pre.length); i++) {
    const s1 = p1.pre[i];
    const s2 = p2.pre[i];

    if (s1 === undefined) return -1; // v1 is shorter, so it's older
    if (s2 === undefined) return 1; // v2 is shorter, so it's older

    // Numeric comparison if both are numbers
    const isNum1 = /^\d+$/.test(s1);
    const isNum2 = /^\d+$/.test(s2);

    if (isNum1 && isNum2) {
      const n1 = Number(s1);
      const n2 = Number(s2);
      if (n1 !== n2) return n1 - n2;
    } else if (isNum1) {
      return -1; // Numbers are less than strings
    } else if (isNum2) {
      return 1; // Strings are greater than numbers
    } else {
      // Lexicographical comparison for strings
      if (s1 !== s2) return s1.localeCompare(s2);
    }
  }

  return 0;
};

const getPackage = async (id: string) => {
  const { rls } = await createDrizzleSupabaseClient();
  const packageData = await rls((db) =>
    db.query.packages.findFirst({
      where: eq(packages.id, id),
      with: {
        primaryOwner: true,
        versions: {
          columns: {
            id: true,
            package_id: true,
            version: true,
            size: true,
            publisher_id: true,
            authors: true,
            license: true,
            yanked: true,
            yanked_message: true,
            yanked_at: true,
            yanked_by_user_id: true,
            downloads: true,
            readme: true,
            changelog: true,
            abi_version: true,
            digest: true,
            tarball: true,
            created_at: true,
            updated_at: true,
          },
          orderBy: desc(package_versions.created_at),
          with: {
            publisher: true,
          },
        },
        owners: {
          with: {
            user: true,
          },
        },
        audits: {
          with: {
            user: true,
          },
        },
      },
    }),
  );

  if (!packageData) {
    return null;
  }

  const totalDownloads = packageData.versions.reduce(
    (acc, v) => acc + v.downloads,
    0,
  );

  // Sort versions by semantic version (descending)
  const semanticallySortedVersions = [...packageData.versions].sort((a, b) =>
    compareSemanticVersions(b.version, a.version)
  );

  // Filter stable versions (no pre-release identifier)
  const stableVersions = packageData.versions.filter(v => !v.version.includes('-'));

  // Sort stable versions semantically (descending)
  const semanticallySortedStableVersions = [...stableVersions].sort((a, b) =>
    compareSemanticVersions(b.version, a.version)
  );

  const stats = {
    total_versions: packageData.versions.length,
    total_downloads: totalDownloads,
    max_version: semanticallySortedVersions[0]?.version || null,
    newest_version: packageData.versions[0]?.version || null,
    max_stable_version: semanticallySortedStableVersions[0]?.version || null,
    yanked_versions: packageData.versions.filter((v) => v.yanked).length,
    total_owners: packageData.owners.length,
    total_audits: packageData.audits.length,
  };

  const versionsObject = packageData.versions.reduce(
    (acc, version) => {
      acc[version.version] = version;
      return acc;
    },
    {} as Record<string, (typeof packageData.versions)[0]>,
  );

  return {
    package: {
      id: packageData.id,
      name: packageData.name,
      categories: packageData.categories,
      primary_owner: packageData.primaryOwner,
      default_version: packageData.default_version,
      keywords: packageData.keywords,
      description: packageData.description,
      homepage: packageData.homepage,
      repository: packageData.repository,
      is_verified: packageData.is_verified,
      is_deprecated: packageData.is_deprecated,
      deprecation_message: packageData.deprecation_message,
      created_at: packageData.created_at,
      updated_at: packageData.updated_at,
      downloads: totalDownloads,
    },
    owners: packageData.owners,
    versions: versionsObject,
    audits: packageData.audits,
    stats,
    authors: packageData.versions.flatMap((v) => v.authors || []),
  };
};

export const GET = async (

  _: Request,

  { params }: { params: Promise<{ id: string }> },

) => {

  try {

    const { id } = await params;
    const data = await getPackage(id);

    if (!data) {
      return NextResponse.json(
        { message: "Package not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(data, { status: 200 });
  } catch (err: unknown) {
    return NextResponse.json(
      { message: "Internal server error", error: String(err) },
      { status: 500 },
    );
  }
};

const packageCategoryEnum = z.enum(["server", "sandbox", "interceptor"]);

const updatePackageSchema = z.object({
  name: z.string().min(1, "Package name cannot be empty").optional(),
  description: z.string().optional(),
  homepage: z.string().url("Homepage must be a valid URL").optional(),
  repository: z.string().url("Repository must be a valid URL").optional(),
  keywords: z.array(z.string()).optional(),
  categories: z.array(packageCategoryEnum).min(1, "At least one category is required").optional(),
  is_verified: z.boolean().optional(),
  is_deprecated: z.boolean().optional(),
  deprecation_message: z.string().optional(),
  default_version: z.string().optional(), // Will need further validation in handler
});

type UpdatePackageInput = z.infer<typeof updatePackageSchema>;

export const PATCH = async (
  request: Request,
  { params }: { params: { id: string } },
) => {
  try {
    const { rls, supabase } = await createDrizzleSupabaseClient();
    const { id } = params;
    const body = await request.json();

    const validation = updatePackageSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { message: "Invalid request body", errors: validation.error.errors },
        { status: 400 },
      );
    }

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Fetch existing package to check ownership
    const existingPackage = await rls((db) =>
      db.query.packages.findFirst({
        where: eq(packages.id, id),
      }),
    );

    if (!existingPackage) {
      return NextResponse.json(
        { message: `Package with ID '${id}' not found` },
        { status: 404 },
      );
    }

    // Check if the authenticated user is the primary owner of the package
    const isPrimaryOwner = existingPackage.primary_owner === userData.user.id;
    // TODO: Also check secondary owners once package_owners table is properly used for authorization

    if (!isPrimaryOwner) {
      return NextResponse.json(
        { message: "Forbidden: User is not the primary owner of this package" },
        { status: 403 },
      );
    }

    const updateData: UpdatePackageInput & { updated_at: Date } = {
      updated_at: new Date(),
    };

    // Only include fields that are present in the request body and are valid
    if (validation.data.name !== undefined) updateData.name = validation.data.name;
    if (validation.data.description !== undefined) updateData.description = validation.data.description;
    if (validation.data.homepage !== undefined) updateData.homepage = validation.data.homepage;
    if (validation.data.repository !== undefined) updateData.repository = validation.data.repository;
    if (validation.data.keywords !== undefined) updateData.keywords = validation.data.keywords;
    if (validation.data.categories !== undefined) updateData.categories = validation.data.categories;
    if (validation.data.is_verified !== undefined) updateData.is_verified = validation.data.is_verified;
    if (validation.data.is_deprecated !== undefined) updateData.is_deprecated = validation.data.is_deprecated;
    if (validation.data.deprecation_message !== undefined) updateData.deprecation_message = validation.data.deprecation_message;
    if (validation.data.default_version !== undefined) {
      // Further validation for default_version: must exist as a version for this package
      const versionExists = await rls((db) =>
        db.query.package_versions.findFirst({
          where: and(
            eq(package_versions.package_id, id),
            eq(package_versions.version, validation.data.default_version!),
          ),
        }),
      );
      if (!versionExists) {
        return NextResponse.json(
          { message: `Default version '${validation.data.default_version}' does not exist for package '${id}'` },
          { status: 400 },
        );
      }
      updateData.default_version = validation.data.default_version;
    }

    const updatedPackage = await rls((db) =>
      db
        .update(packages)
        .set(updateData)
        .where(eq(packages.id, id))
        .returning(),
    );

    if (updatedPackage.length === 0) {
      return NextResponse.json(
        { message: "Failed to update package" },
        { status: 500 },
      );
    }

    return NextResponse.json(updatedPackage[0], { status: 200 });
  } catch (err: unknown) {
    return NextResponse.json(
      { message: "Internal server error", error: String(err) },
      { status: 500 },
    );
  }
};

export const DELETE = async (
  request: Request,
  { params }: { params: { id: string } },
) => {
  try {
    const { rls, supabase } = await createDrizzleSupabaseClient();
    const { id } = params;

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Fetch existing package to check ownership
    const existingPackage = await rls((db) =>
      db.query.packages.findFirst({
        where: eq(packages.id, id),
      }),
    );

    if (!existingPackage) {
      return NextResponse.json(
        { message: `Package with ID '${id}' not found` },
        { status: 404 },
      );
    }

    // Check if the authenticated user is the primary owner of the package
    const isPrimaryOwner = existingPackage.primary_owner === userData.user.id;
    // TODO: Also check secondary owners once package_owners table is properly used for authorization

    if (!isPrimaryOwner) {
      return NextResponse.json(
        { message: "Forbidden: User is not the primary owner of this package" },
        { status: 403 },
      );
    }

    // Delete associated package versions first
    await rls((db) =>
      db.delete(package_versions).where(eq(package_versions.package_id, id)),
    );

    // Then delete the package itself
    const deletedPackage = await rls((db) =>
      db.delete(packages).where(eq(packages.id, id)).returning(),
    );

    if (deletedPackage.length === 0) {
      return NextResponse.json(
        { message: "Failed to delete package" },
        { status: 500 },
      );
    }

    return NextResponse.json(
      { message: `Package '${id}' and its versions deleted successfully` },
      { status: 200 },
    );
  } catch (err: unknown) {
    return NextResponse.json(
      { message: "Internal server error", error: String(err) },
      { status: 500 },
    );
  }
};
