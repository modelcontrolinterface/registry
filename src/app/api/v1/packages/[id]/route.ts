import { z } from "zod";
import { NextResponse } from "next/server";
import { desc, eq, and } from "drizzle-orm";
import { semanticVersionRegex } from "@/lib/regex";
import { compareSemanticVersions } from "@/lib/utils";
import { packages, package_versions } from "@/db/schema";
import { createDrizzleSupabaseClient } from "@/lib/drizzle";

export type GetPackageResult = Awaited<ReturnType<typeof getPackage>>;

const getPackage = async (id: string) => {
  const { rls } = await createDrizzleSupabaseClient();
  const packageData = await rls((db) =>
    db.query.packages.findFirst({
      where: eq(packages.id, id),
      with: {
        versions: {
          columns: {
            id: true,
            version: true,
            authors: true,
            license: true,
            license_file: true,
            is_yanked: true,
            yank_message: true,
            readme: true,
            changelog: true,
            size: true,
            digest: true,
            tarball: true,
            abi_version: true,
            downloads: true,
            created_at: true,
            updated_at: true,
          },
          with: {
            publisher: {
              columns: {
                id: true,
                avatar_url: true,
                email: true,
                display_name: true,
              },
            },
          },
          orderBy: desc(package_versions.created_at),
        },
        primary_owner: {
          columns: {
            id: true,
            avatar_url: true,
            email: true,
            display_name: true,
          },
        },
        owners: {
          with: {
            user: {
              columns: {
                id: true,
                avatar_url: true,
                email: true,
                display_name: true,
              },
            },
          },
        },
      },
    }),
  );

  if (!packageData) {
    return null;
  }

  const stableVersions = packageData.versions.filter(
    (v) => !v.version.includes("-"),
  );
  const semanticallySortedVersions = [...packageData.versions].sort((a, b) =>
    compareSemanticVersions(b.version, a.version),
  );
  const semanticallySortedStableVersions = [...stableVersions].sort((a, b) =>
    compareSemanticVersions(b.version, a.version),
  );

  const meta = {
    total_owners: packageData.owners.length,
    total_versions: packageData.versions.length,
    newest_version: packageData.versions[0]?.version || null,
    max_version: semanticallySortedVersions[0]?.version || null,
    max_stable_version: semanticallySortedStableVersions[0]?.version || null,
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
      description: packageData.description,
      categories: packageData.categories,
      keywords: packageData.keywords,
      homepage: packageData.homepage,
      repository: packageData.repository,
      default_version: packageData.default_version,
      primary_owner: packageData.primary_owner,
      is_verified: packageData.is_verified,
      is_deprecated: packageData.is_deprecated,
      deprecation_message: packageData.deprecation_message,
      created_at: packageData.created_at,
      updated_at: packageData.updated_at,
    },
    owners: packageData.owners.map((owner) => owner.user),
    versions: versionsObject,
    meta,
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

const packageCategoryEnum = z.enum([
  "hook",
  "server",
  "sandbox",
  "interceptor",
]);

const updatePackageSchema = z.object({
  name: z
    .string()
    .min(3, "Package name must be at least 3 characters long")
    .max(64, "Package name must be at most 64 characters long")
    .optional(),
  description: z
    .string()
    .max(500, "Description must be at most 500 characters long")
    .optional(),
  categories: z
    .array(packageCategoryEnum)
    .min(1, "At least one category is required")
    .max(4, "You can select up to 4 categories")
    .optional(),
  keywords: z
    .array(
      z.string().max(64, "Each keyword must be at most 64 characters long"),
    )
    .max(5, "You can have up to 5 keywords")
    .optional(),
  homepage: z.url("Homepage must be a valid URL").optional(),
  repository: z.url("Repository must be a valid URL").optional(),
  default_version: z
    .string()
    .regex(semanticVersionRegex, "Invalid package ID format")
    .optional(),
  primary_owner_id: z.uuid("Primary user must be a UUID").optional(),
  is_deprecated: z.boolean().optional(),
  deprecation_message: z.string().optional(),
});

type UpdatePackageInput = z.infer<typeof updatePackageSchema>;

export const PATCH = async (
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) => {
  try {
    const { rls, supabase } = await createDrizzleSupabaseClient();
    const { id } = await params;
    const body = await request.json();

    const validation = updatePackageSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { message: "Invalid request body", errors: validation.error.issues },
        { status: 400 },
      );
    }

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const existingPackage = await rls((db) =>
      db.query.packages.findFirst({
        where: eq(packages.id, id),
        with: {
          primary_owner: {
            columns: {
              id: true,
            },
          },
          owners: {
            with: {
              user: {
                columns: {
                  id: true,
                },
              },
            },
          },
        },
      }),
    );
    if (!existingPackage) {
      return NextResponse.json(
        { message: `Package with ID '${id}' not found` },
        { status: 404 },
      );
    }

    const isPrimaryOwner =
      existingPackage.primary_owner.id === userData.user.id;
    const isCoOwner = existingPackage.owners.some(
      (owner) => owner.user.id === userData.user.id,
    );
    const isOwner = isPrimaryOwner || isCoOwner;

    if (!isOwner) {
      return NextResponse.json(
        { message: "Forbidden: User is not an owner of this package" },
        { status: 403 },
      );
    }

    const updateData: UpdatePackageInput & { updated_at: Date } = {
      updated_at: new Date(),
    };

    if (validation.data.name !== undefined)
      updateData.name = validation.data.name;
    if (validation.data.description !== undefined)
      updateData.description = validation.data.description;
    if (validation.data.categories !== undefined)
      updateData.categories = validation.data.categories;
    if (validation.data.keywords !== undefined)
      updateData.keywords = validation.data.keywords;
    if (validation.data.homepage !== undefined)
      updateData.homepage = validation.data.homepage;
    if (validation.data.repository !== undefined)
      updateData.repository = validation.data.repository;
    if (validation.data.primary_owner_id !== undefined)
      updateData.primary_owner_id = validation.data.primary_owner_id;
    if (validation.data.is_deprecated !== undefined)
      updateData.is_deprecated = validation.data.is_deprecated;
    if (validation.data.deprecation_message !== undefined)
      updateData.deprecation_message = validation.data.deprecation_message;
    if (validation.data.default_version !== undefined) {
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
          {
            message: `Default version '${validation.data.default_version}' does not exist for package '${id}'`,
          },
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
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) => {
  try {
    const { rls, supabase } = await createDrizzleSupabaseClient();
    const { id } = await params;

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const existingPackage = await rls((db) =>
      db.query.packages.findFirst({
        where: eq(packages.id, id),
        with: {
          primary_owner: {
            columns: {
              id: true,
            },
          },
        },
      }),
    );
    if (!existingPackage) {
      return NextResponse.json(
        { message: `Package with ID '${id}' not found` },
        { status: 404 },
      );
    }

    const isOwner = existingPackage.primary_owner.id === userData.user.id;

    if (!isOwner) {
      return NextResponse.json(
        { message: "Forbidden: User is not an owner of this package" },
        { status: 403 },
      );
    }

    await rls((db) =>
      db.delete(package_versions).where(eq(package_versions.package_id, id)),
    );

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
