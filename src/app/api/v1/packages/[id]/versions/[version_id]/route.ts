import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { NextResponse } from "next/server";
import { packages, package_versions } from "@/db/schema";
import { createDrizzleSupabaseClient } from "@/lib/drizzle";

async function uploadFileToStorage(
  supabase: any,
  bucketName: string,
  filePath: string,
  file: File,
): Promise<string> {
  const { error } = await supabase.storage
    .from(bucketName)
    .upload(filePath, file, {
      upsert: true,
      cacheControl: "3600",
      contentType: file.type,
    });

  if (error) {
    throw new Error(`Upload failed for ${filePath}: ${error.message}`);
  }

  const { data } = supabase.storage.from(bucketName).getPublicUrl(filePath);
  return data.publicUrl;
}

const MAX_README_SIZE = 512_000;
const MAX_CHANGELOG_SIZE = 512_000;
const ALLOWED_MARKDOWN_MIMES = ["text/markdown"];

const updatePackageVersionSchema = z.object({
  authors: z
    .array(
      z.object({
        name: z.string().min(1, "Author name is required"),
        email: z.email("Invalid email format").optional(),
        url: z.url("Invalid URL format").optional(),
      }),
    )
    .min(1, "Authors is required"),
  is_yanked: z
    .string()
    .optional()
    .default("false")
    .transform((val) => val === "true"),
  yank_message: z
    .string()
    .max(100, "Yank message must be at most 100 characters long")
    .optional(),
  readme_file: z
    .instanceof(File)
    .optional()
    .refine(
      (file) => !file || file.size <= MAX_README_SIZE,
      `README file size must be less than ${MAX_README_SIZE / 1000}KB`,
    )
    .refine(
      (file) => !file || ALLOWED_MARKDOWN_MIMES.includes(file.type),
      `README file must be a markdown file (${ALLOWED_MARKDOWN_MIMES.join(", ")})`,
    ),
  changelog_file: z
    .instanceof(File)
    .optional()
    .refine(
      (file) => !file || file.size <= MAX_CHANGELOG_SIZE,
      `Changelog file size must be less than ${MAX_CHANGELOG_SIZE / 1000}KB`,
    )
    .refine(
      (file) => !file || ALLOWED_MARKDOWN_MIMES.includes(file.type),
      `Changelog file must be a markdown file (${ALLOWED_MARKDOWN_MIMES.join(", ")})`,
    ),
});

export const GET = async (
  _: Request,
  { params }: { params: Promise<{ id: string; version_id: string }> },
) => {
  try {
    const { rls } = await createDrizzleSupabaseClient();
    const { id: package_id, version_id: requested_version } = await params;

    let versionToFetch = requested_version;

    if (requested_version === "default") {
      const packageData = await rls((db) =>
        db.query.packages.findFirst({
          where: eq(packages.id, package_id),
          columns: {
            default_version: true,
          },
        }),
      );

      if (!packageData || !packageData.default_version) {
        return NextResponse.json(
          { message: `Default version not set for package '${package_id}'` },
          { status: 404 },
        );
      }
      versionToFetch = packageData.default_version;
    }

    const versionData = await rls((db) =>
      db.query.package_versions.findFirst({
        where: and(
          eq(package_versions.package_id, package_id),
          eq(package_versions.version, versionToFetch),
        ),
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
      }),
    );

    if (!versionData) {
      return NextResponse.json(
        {
          message: `Version '${versionToFetch}' for package '${package_id}' not found`,
        },
        { status: 404 },
      );
    }

    return NextResponse.json(versionData, { status: 200 });
  } catch (err: unknown) {
    return NextResponse.json(
      { message: "Internal server error", error: String(err) },
      { status: 500 },
    );
  }
};

export const PATCH = async (
  request: Request,
  { params }: { params: Promise<{ id: string; version_id: string }> },
) => {
  try {
    const { rls, supabase } = await createDrizzleSupabaseClient();
    const { id: package_id, version_id: version } = await params;

    const formData = await request.formData();

    const license = formData.get("license") as string | undefined;
    const abi_version = formData.get("abi_version") as string | undefined;
    const readme_file = formData.get("readme_file") as File | undefined;
    const changelog_file = formData.get("changelog_file") as File | undefined;
    const is_yanked_string = formData.get("is_yanked") as string | undefined;
    const yank_message = formData.get("yank_message") as string | undefined;

    const validation = updatePackageVersionSchema.safeParse({
      license,
      abi_version,
      readme_file,
      changelog_file,
      is_yanked: is_yanked_string,
      yank_message,
    });

    if (!validation.success) {
      return NextResponse.json(
        { message: "Invalid request body", errors: validation.error.issues },
        { status: 400 },
      );
    }

    const {
      readme_file: validatedReadmeFile,
      changelog_file: validatedChangelogFile,
      is_yanked: validatedIsYanked,
      yank_message: validatedYankMessage,
    } = validation.data;

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

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
        {
          message: `Version '${version}' for package '${package_id}' not found`,
        },
        { status: 404 },
      );
    }

    const parentPackage = await rls((db) =>
      db.query.packages.findFirst({
        where: eq(packages.id, package_id),
        with: {
          primary_owner: { columns: { id: true } },
        },
      }),
    );

    if (!parentPackage) {
      return NextResponse.json(
        { message: `Parent package with ID '${package_id}' not found` },
        { status: 404 },
      );
    }

    const isPublisher =
      existingPackageVersion.publisher_id === userData.user.id;
    const isPrimaryOwner = parentPackage.primary_owner.id === userData.user.id;

    if (!isPublisher || !isPrimaryOwner) {
      return NextResponse.json(
        {
          message:
            "Forbidden: User is neither the publisher of this version nor the primary owner of the package",
        },
        { status: 403 },
      );
    }

    const updateData: any = {
      updated_at: new Date(),
    };

    const storagePath = `packages/${package_id}/${version}`;

    if (validatedReadmeFile) {
      const readmeUrl = await uploadFileToStorage(
        supabase,
        "package-files",
        `${storagePath}/README.md`,
        validatedReadmeFile,
      );
      updateData.readme = readmeUrl;
    }
    if (validatedChangelogFile) {
      const changelogUrl = await uploadFileToStorage(
        supabase,
        "package-files",
        `${storagePath}/CHANGELOG.md`,
        validatedChangelogFile,
      );
      updateData.changelog_url = changelogUrl;
    }

    if (validatedIsYanked !== undefined) {
      updateData.is_yanked = validatedIsYanked;
      if (validatedIsYanked) {
        updateData.yanked_at = new Date();
        updateData.yanked_by_user_id = userData.user.id;
        updateData.yank_message =
          validatedYankMessage ?? "Version yanked by user request.";
      } else {
        updateData.yanked_at = null;
        updateData.yanked_by_user_id = null;
        updateData.yank_message = null;
      }
    } else if (validatedYankMessage !== undefined) {
      if (existingPackageVersion.is_yanked) {
        updateData.yank_message = validatedYankMessage;
      }
    }

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
