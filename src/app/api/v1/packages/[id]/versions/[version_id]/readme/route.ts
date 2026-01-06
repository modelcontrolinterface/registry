import { eq, and } from "drizzle-orm";
import { NextResponse } from "next/server";
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
          eq(package_versions.package_id, package_id),
          eq(package_versions.version, version_id),
        ),
        columns: {
          readme_url: true,
        },
      }),
    );

    if (!versionData || !versionData.readme_url) {
      return new NextResponse("Not Found", { status: 404 });
    }

    const response = await fetch(versionData.readme_url);
    if (!response.ok) {
      throw new Error(
        `Failed to fetch readme content from URL: ${response.statusText}`,
      );
    }

    return new NextResponse(await response.text(), {
      status: 200,
      headers: {
        "Content-Type": "text/plain",
      },
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { message: "Internal server error", error: String(err) },
      { status: 500 },
    );
  }
};
