import { z } from "zod";
import { NextResponse } from "next/server";
import { packages, package_versions } from "@/db/schema";
import { createDrizzleSupabaseClient } from "@/lib/drizzle";
import { eq, and } from "drizzle-orm";

const semanticVersionRegex = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/;

const createPackageVersionSchema = z.object({
  version: z.string().regex(semanticVersionRegex, "Invalid semantic version format").min(1, "Version is required"),
  is_stable: z.boolean().default(false).optional(),
  size: z.number().min(0, "Size must be a non-negative number"),
  authors: z.array(z.object({
    name: z.string().min(1, "Author name is required"),
    email: z.string().email("Invalid email format").optional(),
    url: z.string().url("Invalid URL format").optional(),
  })).optional(),
  license: z.string().optional(),
  readme: z.string().url("Readme must be a valid URL"),
  changelog: z.string().url("Changelog must be a valid URL").optional(),
  abi_version: z.string().optional(),
  digest: z.string().regex(/^[a-f0-9]{64}$/i, "Invalid SHA256 digest format").min(1, "Digest is required"), // Assuming SHA256
  tarball: z.string().url("Tarball must be a valid URL"),
});

export const POST = async (
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) => {
  try {
    const { rls, supabase } = await createDrizzleSupabaseClient();
    const { id: package_id } = await params;
    const body = await request.json();

    const validation = createPackageVersionSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { message: "Invalid request body", errors: validation.error.issues },
        { status: 400 },
      );
    }

    const {
      version,
      is_stable,
      size,
      authors,
      license,
      readme,
      changelog,
      abi_version,
      digest,
      tarball,
    } = validation.data;

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Check if the package exists
    const existingPackage = await rls((db) =>
      db.query.packages.findFirst({
        where: eq(packages.id, package_id),
      }),
    );

    if (!existingPackage) {
      return NextResponse.json(
        { message: `Package with ID '${package_id}' not found` },
        { status: 404 },
      );
    }

    // Check if the authenticated user is an owner of the package
    const isOwner = existingPackage.primary_owner === userData.user.id;
    // TODO: Also check secondary owners once package_owners table is properly used for authorization

    if (!isOwner) {
      return NextResponse.json(
        { message: "Forbidden: User is not an owner of this package" },
        { status: 403 },
      );
    }

    // Check if package version already exists
    const existingVersion = await rls((db) =>
      db.query.package_versions.findFirst({
        where: and(
          eq(package_versions.package_id, package_id),
          eq(package_versions.version, version),
        ),
      }),
    );

    if (existingVersion) {
      return NextResponse.json(
        { message: `Version '${version}' for package '${package_id}' already exists` },
        { status: 409 },
      );
    }

    const newPackageVersion = await rls((db) =>
      db
        .insert(package_versions)
        .values({
          package_id,
          version,
          is_stable,
          size,
          publisher_id: userData.user.id,
          authors,
          license,
          readme,
          changelog,
          abi_version,
          digest,
          tarball,
        } as typeof package_versions.$inferInsert)
        .returning(),
    );

    // If this is the first version for the package, set it as default_version
    if (!existingPackage.default_version) {
      await rls((db) =>
        db
          .update(packages)
          .set({ default_version: version })
          .where(eq(packages.id, package_id)),
      );
    }

    return NextResponse.json(newPackageVersion[0], { status: 201 });
  } catch (err: unknown) {
    return NextResponse.json(
      { message: "Internal server error", error: String(err) },
      { status: 500 },
    );
  }
};
