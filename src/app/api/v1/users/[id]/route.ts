import { eq, desc } from "drizzle-orm";
import { users, packages } from "@/db/schema";
import { NextRequest, NextResponse } from "next/server";
import { createDrizzleSupabaseClient } from "@/lib/drizzle";

export type GetUserResult = Awaited<ReturnType<typeof getUser>>;

const getUser = async (db: any, id: string) => {
  const user = await db.query.users.findFirst({
    where: eq(users.id, id),
  });

  if (!user) {
    return null;
  }

  const ownedPackages = await db.query.packages.findMany({
    where: eq(packages.primary_owner, user.id),
    orderBy: desc(packages.created_at),
  });

  return {
    user,
    owned: {
      packages: ownedPackages,
      pagination: {
        total: ownedPackages.length,
        totalPages: 1,
      },
    },
  };
};

export async function GET(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { rls } = await createDrizzleSupabaseClient();
  const user = await rls((db) => getUser(db, id));

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json(user);
}

