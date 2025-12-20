import { z } from "zod";
import { NextResponse } from "next/server";
import { packages, package_versions } from "@/db/schema";
import { createDrizzleSupabaseClient } from "@/lib/drizzle";
import { eq, and } from "drizzle-orm";

const updatePackageVersionSchema = z.object({
  yanked: z.boolean().optional(),
  yanked_message: z.string().optional(),
  readme: z.string().url("Readme must be a valid URL").optional(),
  changelog: z.string().url("Changelog must be a valid URL").optional(),
});

type UpdatePackageVersionInput = z.infer<typeof updatePackageVersionSchema>;

export const PATCH = async (
  request: Request,
  { params }: { params: Promise<{ id: string; version_id: string }> },
) => {
  try {
    const { rls, supabase } = await createDrizzleSupabaseClient();
    const { id: package_id, version_id: version } = await params;
    const body = await request.json();

    const validation = updatePackageVersionSchema.safeParse(body);
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

    // Fetch existing package version
    const existingPackageVersion = await rls((db) =>
      db.query.package_versions.findFirst({
        where: and(
          eq(package_versions.package_id, package_id),
          eq(package_versions.version, version),
        ),
      }),
    );

    if (!existingPackageVersion) {
      return NextResponse.json(
        { message: `Version '${version}' for package '${package_id}' not found` },
        { status: 404 },
      );
    }

    // Fetch parent package to check primary owner
    const parentPackage = await rls((db) =>
      db.query.packages.findFirst({
        where: eq(packages.id, package_id),
      }),
    );

    if (!parentPackage) {
      // This should ideally not happen if existingPackageVersion was found, but as a safeguard
      return NextResponse.json(
        { message: `Parent package with ID '${package_id}' not found` },
        { status: 404 },
      );
    }

    // Check if the authenticated user is the publisher of this version OR the primary owner of the package
    const isPublisher = existingPackageVersion.publisher_id === userData.user.id;
    const isPrimaryOwner = parentPackage.primary_owner === userData.user.id;

    if (!isPublisher && !isPrimaryOwner) {
      return NextResponse.json(
        { message: "Forbidden: User is neither the publisher of this version nor the primary owner of the package" },
        { status: 403 },
      );
    }

    const updateData: UpdatePackageVersionInput & { updated_at: Date; yanked_at?: Date | null; yanked_by_user_id?: string | null } = {
      updated_at: new Date(),
    };

    if (validation.data.yanked !== undefined) {
      updateData.yanked = validation.data.yanked;
      if (validation.data.yanked) {
        updateData.yanked_at = new Date();
        updateData.yanked_by_user_id = userData.user.id;
      } else {
        // If un-yanked, clear yanked_at and yanked_by_user_id
        updateData.yanked_at = null;
        updateData.yanked_by_user_id = null;
      }
    }
    if (validation.data.yanked_message !== undefined) updateData.yanked_message = validation.data.yanked_message;
    if (validation.data.readme !== undefined) updateData.readme = validation.data.readme;
    if (validation.data.changelog !== undefined) updateData.changelog = validation.data.changelog;

    const updatedPackageVersion = await rls((db) =>
      db
        .update(package_versions)
        .set(updateData)
        .where(
          and(
            eq(package_versions.package_id, package_id),
            eq(package_versions.version, version),
          ),
        )
        .returning(),
    );

    if (updatedPackageVersion.length === 0) {
      return NextResponse.json(
        { message: "Failed to update package version" },
        { status: 500 },
      );
    }

    return NextResponse.json(updatedPackageVersion[0], { status: 200 });
  } catch (err: unknown) {
    return NextResponse.json(
      { message: "Internal server error", error: String(err) },
      { status: 500 },
    );
  }
};
