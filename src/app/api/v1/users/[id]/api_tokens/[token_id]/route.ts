import { NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { api_tokens } from "@/db/schema";
import { createDrizzleSupabaseClient } from "@/lib/drizzle";

export const DELETE = async (
  _: Request,
  { params }: { params: Promise<{ id: string; token_id: string }> },
) => {
  try {
    const { rls, supabase } = await createDrizzleSupabaseClient();
    const { id: user_id, token_id } = await params;

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    if (userData.user.id !== user_id) {
      return NextResponse.json(
        { message: "Forbidden: You can only delete your own API tokens" },
        { status: 403 },
      );
    }

    const deletedTokens = await rls((db) =>
      db
        .delete(api_tokens)
        .where(and(eq(api_tokens.id, token_id), eq(api_tokens.user_id, user_id)))
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
    console.error("Error deleting API token:", err);
    return NextResponse.json(
      { message: "Internal server error", error: String(err) },
      { status: 500 },
    );
  }
};
