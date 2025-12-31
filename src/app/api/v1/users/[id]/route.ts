import { eq } from "drizzle-orm";
import { users } from "@/db/schema";
import * as schema from "@/db/schema";
import { NextRequest, NextResponse } from "next/server";
import { createDrizzleSupabaseClient } from "@/lib/drizzle";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";

type DbClient = PostgresJsDatabase<typeof schema>;

interface GetUserReturn {
  user: typeof users.$inferSelect;
}

export type GetUserResult = GetUserReturn | null;

const getUser = async (
  db: DbClient,
  id: string,
): Promise<GetUserReturn | null> => {
  const user = await db.query.users.findFirst({ where: eq(users.id, id) });

  if (!user) {
    return null;
  }

  return { user };
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
