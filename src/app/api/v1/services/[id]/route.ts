import * as schema from "@/db/schema";
import { NextResponse } from "next/server";
import { desc, eq, sql } from "drizzle-orm";
import { createDrizzleSupabaseClient } from "@/lib/drizzle";

export type GetServiceResult = Awaited<ReturnType<typeof getService>>;

const getService = async (id: string) => {
  const { rls } = await createDrizzleSupabaseClient();
  const serviceData = await rls((db) =>
    db.query.services.findFirst({
      where: eq(schema.services.id, id),
      with: {
        primaryOwner: true,
        versions: {
          orderBy: desc(schema.service_versions.created_at),
          with: {
            publisher: true,
            contributors: {
              with: {
                user: true,
              },
            },
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

  if (!serviceData) {
    return null;
  }

  const downloadsResult = await rls((db) =>
    db
      .select({
        total: sql<number>`sum(${schema.service_versions.downloads})`,
      })
      .from(schema.service_versions)
      .where(eq(schema.service_versions.service_id, id)),
  );

  const totalDownloads = downloadsResult[0]?.total ?? 0;

  const defaultVersion = serviceData.default_version
    ? serviceData.versions.find((v) => v.id === serviceData.default_version)
    : null;

  const stats = {
    total_versions: serviceData.versions.length,
    total_downloads: totalDownloads,
    latest_version: serviceData.versions[0]?.version || null,
    yanked_versions: serviceData.versions.filter((v) => v.yanked).length,
    total_owners: serviceData.owners.length,
    total_contributors: serviceData.versions.flatMap((v) => v.contributors)
      .length,
    total_audits: serviceData.audits.length,
  };

  return {
    service: {
      ...serviceData,
      downloads: totalDownloads,
      default_version_data: defaultVersion,
    },
    owners: serviceData.owners,
    contributors: serviceData.versions.flatMap((v) => v.contributors),
    versions: serviceData.versions,
    audits: serviceData.audits,
    stats,
  };
};

export const GET = async (
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) => {
  try {
    const { id } = await params;

    const data = await getService(id);

    if (!data) {
      return NextResponse.json(
        { message: "Service not found" },
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
