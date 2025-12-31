import { z } from "zod";
import crypto from "crypto";
import { eq, and } from "drizzle-orm";
import { NextResponse } from "next/server";
import { semanticVersionRegex } from "@/lib/regex";
import { packages, package_versions } from "@/db/schema";
import { createDrizzleSupabaseClient } from "@/lib/drizzle";

async function calculateFileDigest(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hash = crypto.createHash("sha256");
  hash.update(Buffer.from(buffer));
  return hash.digest("hex");
}

async function uploadFileToStorage(
  supabase: any,
  bucketName: string,
  filePath: string,
  file: File,
): Promise<string> {
  const { data, error } = await supabase.storage
    .from(bucketName)
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (error) {
    throw new Error(`Failed to upload file to storage: ${error.message}`);
  }

  const { data: publicUrlData } = supabase.storage
    .from(bucketName)
    .getPublicUrl(filePath);

  return publicUrlData.publicUrl;
}

const MAX_README_SIZE = 512_000;
const MAX_CHANGELOG_SIZE = 512_000;
const MAX_TARBALL_SIZE = 52_428_800;
const MAX_LICENSE_FILE_SIZE = 512_000;

const ALLOWED_MARKDOWN_MIMES = ["text/markdown"];
const ALLOWED_TARBALL_MIMES = ["application/x-tar"];

const createPackageVersionSchema = z.object({
  version: z
    .string()
    .min(1, "Version is required")
    .regex(semanticVersionRegex, "Invalid semantic version format"),
  authors: z
    .array(
      z.object({
        name: z.string().min(1, "Author name is required"),
        email: z.string().email("Invalid email format").optional(),
        url: z.string().url("Invalid URL format").optional(),
      }),
    )
    .min(1, "Authors is required"),
  license: z.string().optional(),
  license_file: z
    .instanceof(File)
    .optional()
    .refine(
      (file) => !file || file.size <= MAX_LICENSE_FILE_SIZE,
      `License file size must be less than ${MAX_LICENSE_FILE_SIZE / 1000}KB`,
    )
    .refine(
      (file) => !file || ALLOWED_MARKDOWN_MIMES.includes(file.type),
      `License file must be a markdown file (${ALLOWED_MARKDOWN_MIMES.join(", ")})`,
    ),
  readme: z
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
  changelog: z
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
  tarball: z
    .instanceof(File)
    .refine(
      (file) => file.size <= MAX_TARBALL_SIZE,
      `Tarball file size must be less than ${MAX_TARBALL_SIZE / (1024 * 1024)}MB`,
    )
    .refine(
      (file) => ALLOWED_TARBALL_MIMES.includes(file.type),
      `Tarball file must be a valid type (${ALLOWED_TARBALL_MIMES.join(", ")})`,
    ),
  abi_version: z
    .string()
    .regex(semanticVersionRegex, "Invalid semantic version format")
    .min(1, "ABI version is required"),
  // is_yanked and yank_message removed
});

export const POST = async (
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) => {
  try {
    const { rls, supabase } = await createDrizzleSupabaseClient();
    const { id: package_id } = await params;

    const formData = await request.formData();

    // Extract fields from formData
    const version = formData.get("version") as string;
    const authorsString = formData.get("authors") as string;
    const license = formData.get("license") as string | undefined;
    const license_file_file = formData.get("license_file") as File | undefined;
    const readme_file = formData.get("readme") as File | undefined;
    const changelog_file = formData.get("changelog") as File | undefined;
    const tarball_file = formData.get("tarball") as File;
    const abi_version = formData.get("abi_version") as string;
    // is_yanked_string and yank_message removed

    let parsedAuthors: any[] = [];
    try {
      parsedAuthors = JSON.parse(authorsString);
    } catch (e) {
      return NextResponse.json(
        { message: "Invalid authors JSON format" },
        { status: 400 },
      );
    }

    // Manually validate the extracted fields
    const validation = createPackageVersionSchema.safeParse({
      version,
      authors: parsedAuthors, // Pass the parsed object
      license,
      license_file: license_file_file,
      readme: readme_file,
      changelog: changelog_file,
      tarball: tarball_file,
      abi_version,
    });

    if (!validation.success) {
      return NextResponse.json(
        { message: "Invalid request body", errors: validation.error.issues },
        { status: 400 },
      );
    }

    const {
      version: validatedVersion,
      authors: validatedAuthors,
      license: validatedLicense,
      license_file: validatedLicenseFile,
      readme: validatedReadme,
      changelog: validatedChangelog,
      abi_version: validatedAbiVersion,
      tarball: validatedTarball,
    } = validation.data;

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const existingPackage = await rls((db) =>
      db.query.packages.findFirst({
        where: eq(packages.id, package_id),
        with: {
          primaryOwner: { columns: { id: true } },
          owners: { with: { user: { columns: { id: true } } } },
        },
      }),
    );

    if (!existingPackage) {
      return NextResponse.json(
        { message: `Package with ID '${package_id}' not found` },
        { status: 404 },
      );
    }

    const isPrimaryOwner = existingPackage.primaryOwner.id === userData.user.id;
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

    const existingVersion = await rls((db) =>
      db.query.package_versions.findFirst({
        where: and(
          eq(package_versions.package_id, package_id),
          eq(package_versions.version, validatedVersion),
        ),
      }),
    );

    if (existingVersion) {
      return NextResponse.json(
        {
          message: `Version '${validatedVersion}' for package '${package_id}' already exists`,
        },
        { status: 409 },
      );
    }

    // File Uploads and Digest/Size Calculation
    const storagePath = `packages/${package_id}/versions/${validatedVersion}`;
    let readmeUrl: string | null = null;
    let changelogUrl: string | null = null;
    let licenseFileUrl: string | null = null;
    let tarballUrl: string;
    let tarballSize: number;
    let tarballDigest: string;

    if (validatedReadme) {
      readmeUrl = await uploadFileToStorage(
        supabase,
        "package-files",
        `${storagePath}/readme.md`,
        validatedReadme,
      );
    }
    if (validatedChangelog) {
      changelogUrl = await uploadFileToStorage(
        supabase,
        "package-files",
        `${storagePath}/changelog.md`,
        validatedChangelog,
      );
    }
    if (validatedLicenseFile) {
      licenseFileUrl = await uploadFileToStorage(
        supabase,
        "package-files",
        `${storagePath}/license.md`, // Assuming license files are markdown
        validatedLicenseFile,
      );
    }

    // Tarball is required
    tarballUrl = await uploadFileToStorage(
      supabase,
      "package-files",
      `${storagePath}/tarball.tar.gz`,
      validatedTarball,
    );
    tarballSize = validatedTarball.size;
    tarballDigest = await calculateFileDigest(validatedTarball);

    const is_stable = !validatedVersion.includes("-");

    const newPackageVersion = await rls((db) =>
      db
        .insert(package_versions)
        .values({
          package_id,
          version: validatedVersion,
          is_stable,
          size: tarballSize,
          publisher_id: userData.user.id,
          authors: validatedAuthors,
          license: validatedLicense ?? null,
          license_file: licenseFileUrl,
          readme: readmeUrl,
          changelog: changelogUrl,
          abi_version: validatedAbiVersion,
          digest: tarballDigest,
          tarball: tarballUrl,
          // is_yanked: validatedIsYanked, // Removed
          // yank_message: validatedYankMessage ?? null, // Removed
        })
        .returning(),
    );

    // If this is the first version for the package, set it as default_version
    if (!existingPackage.default_version) {
      await rls((db) =>
        db
          .update(packages)
          .set({ default_version: validatedVersion })
          .where(eq(packages.id, package_id)),
      );
    }

    return NextResponse.json(newPackageVersion[0], { status: 201 });
  } catch (err: unknown) {
    console.error("Error creating package version:", err);
    return NextResponse.json(
      { message: "Internal server error", error: String(err) },
      { status: 500 },
    );
  }
};

