import { NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { package_versions } from "@/db/schema";
import { createDrizzleSupabaseClient } from "@/lib/drizzle";

export const GET = async (
  _: Request,
  { params }: { params: { id: string; version_id: string } },
) => {
  try {
    const { id: package_id, version_id } = params;
    const { rls } = await createDrizzleSupabaseClient();

    const versionData = await rls((db) =>
      db.query.package_versions.findFirst({
        where: and(
          eq(package_versions.package_id, package_id),
          eq(package_versions.version, version_id),
        ),
        columns: {
          changelog_url: true,
        },
      }),
    );

    if (!versionData || !versionData.changelog_url) {
      return new NextResponse("Not Found", { status: 404 });
    }

    // Fetch content from the URL
    const response = await fetch(versionData.changelog_url);
    if (!response.ok) {
      throw new Error(`Failed to fetch changelog content from URL: ${response.statusText}`);
    }
    const changelogContent = await response.text();

    return new NextResponse(changelogContent, {
      status: 200,
      headers: {
        "Content-Type": "text/plain",
      },
    });
  } catch (err: unknown) {
    console.error("Error fetching changelog content:", err);
    return NextResponse.json(
      { message: "Internal server error", error: String(err) },
      { status: 500 },
    );
  }
};