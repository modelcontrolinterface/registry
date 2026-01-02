import { eq, and } from "drizzle-orm";
import { api_tokens } from "@/db/schema";
import { NextResponse } from "next/server";
import { createDrizzleSupabaseClient } from "@/lib/drizzle";

export const DELETE = async (
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) => {
  try {
    const { id: token_id } = await params;
    const { rls, supabase } = await createDrizzleSupabaseClient();

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const deletedTokens = await rls((db) =>
      db
        .delete(api_tokens)
        .where(
          and(
            eq(api_tokens.id, token_id),
            eq(api_tokens.user_id, userData.user.id),
          ),
        )
        .returning(),
    );

    if (deletedTokens.length === 0) {
      return NextResponse.json(
        { message: "API token not found or already deleted" },
        { status: 404 },
      );
    }

    return NextResponse.json(
      { message: `API token '${token_id}' deleted successfully` },
      { status: 200 },
    );
  } catch (err: unknown) {
    return NextResponse.json(
      { message: "Internal server error", error: String(err) },
      { status: 500 },
    );
  }
};
