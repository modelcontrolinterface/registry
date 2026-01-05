import { eq, and } from "drizzle-orm";
import { api_tokens } from "@/db/schema";
import { NextResponse, NextRequest } from "next/server";
import { createDrizzleSupabaseClient } from "@/lib/drizzle";

export const DELETE = async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string; tokenId: string }> },
) => {
  try {
    const { id: user_id, tokenId: token_id } = await params;
    const authenticatedUserId = request.headers.get("x-user-id");

    if (authenticatedUserId !== user_id) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const { rls } = await createDrizzleSupabaseClient();
    const deletedTokens = await rls((db) =>
      db
        .delete(api_tokens)
        .where(
          and(eq(api_tokens.id, token_id), eq(api_tokens.user_id, user_id)),
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
