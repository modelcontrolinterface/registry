import { NextResponse } from "next/server";
import { desc, eq, sql } from "drizzle-orm";
import { packages, package_versions } from "@/db/schema";
import { createDrizzleSupabaseClient } from "@/lib/drizzle";

export type GetPackageResult = Awaited<ReturnType<typeof getPackage>>;

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

  const downloadsResult = await rls((db) =>
    db
      .select({
        total: sql<number>`sum(${package_versions.downloads})`,
      })
      .from(package_versions)
      .where(eq(package_versions.package_id, id)),
  );

  const totalDownloads = downloadsResult[0]?.total ?? 0;

  const defaultVersion = packageData.default_version
    ? packageData.versions.find((v) => v.id === packageData.default_version)
    : null;

  const stats = {
    total_versions: packageData.versions.length,
    total_downloads: totalDownloads,
    latest_version: packageData.versions[0]?.version || null,
    yanked_versions: packageData.versions.filter((v) => v.yanked).length,
    total_owners: packageData.owners.length,
    total_audits: packageData.audits.length,
  };

  return {
    package: {
      ...packageData,
      downloads: totalDownloads,
      default_version_data: defaultVersion,
    },
    owners: packageData.owners,
    versions: packageData.versions,
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
  } catch (err: any) {
    return NextResponse.json(
      { message: "Internal server error", error: String(err) },
      { status: 500 },
    );
  }
};
