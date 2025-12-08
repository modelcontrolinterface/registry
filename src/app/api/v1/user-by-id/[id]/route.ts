import { eq } from "drizzle-orm";
import { users } from "@/db/schema";
import { NextResponse } from "next/server";
import { createDrizzleSupabaseClient } from "@/lib/drizzle";

export const GET = async (
  _: Request,
  context: { params: Promise<{ id: string }> },
) => {
  try {
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json({ error: "Id is required" }, { status: 400 });
    }

    const { rls } = await createDrizzleSupabaseClient();
    const user = await rls((tx) =>
      tx.select().from(users).where(eq(users.id, id)).limit(1),
    );

    if (!user || user.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(user[0]);
  } catch (error) {
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
