import { NextResponse } from "next/server";
import { eq, and, sql } from "drizzle-orm";
import { package_versions } from "@/db/schema";
import { createDrizzleSupabaseClient } from "@/lib/drizzle";

export const GET = async (
  _: Request,
  { params }: { params: Promise<{ id: string; version_id: string }> },
) => {
  try {
    const { id: package_id, version_id } = await params;
    const { rls } = await createDrizzleSupabaseClient();

    const versionData = await rls((db) =>
      db.query.package_versions.findFirst({
        where: and(
          eq(package_versions.version, version_id),
          eq(package_versions.package_id, package_id),
        ),
        columns: {
          tarball: true,
          downloads: true,
        },
      }),
    );

    if (!versionData || !versionData.tarball) {
      return new NextResponse("Not Found", { status: 404 });
    }

    const tarballResponse = await fetch(versionData.tarball);
    if (!tarballResponse.ok) {
      throw new Error(
        `Failed to fetch tarball from URL: ${tarballResponse.statusText}`,
      );
    }

    await rls((db) =>
      db
        .update(package_versions)
        .set({
          downloads: sql`${package_versions.downloads} + 1`,
          updated_at: new Date(),
        })
        .where(
          and(
            eq(package_versions.package_id, package_id),
            eq(package_versions.version, version_id),
          ),
        ),
    );

    const urlParts = versionData.tarball.split("/");
    const filename = urlParts[urlParts.length - 1];

    const headers: Record<string, string> = {
      "Content-Type":
        tarballResponse.headers.get("Content-Type") ||
        "application/octet-stream",
      "Content-Disposition": `attachment; filename="${filename}"`,
    };

    const contentLength = tarballResponse.headers.get("Content-Length");
    if (contentLength) {
      headers["Content-Length"] = contentLength;
    }

    return new NextResponse(tarballResponse.body, {
      status: 200,
      headers: headers,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { message: "Internal server error", error: String(err) },
      { status: 500 },
    );
  }
};
