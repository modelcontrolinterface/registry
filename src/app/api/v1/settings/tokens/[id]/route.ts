import { eq, and } from "drizzle-orm";
import { NextResponse } from "next/server";
import { automation_tokens } from "@/db/schema";
import { createDrizzleSupabaseClient } from "@/lib/drizzle";

export const DELETE = async (
  _: Request,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const { rls, supabase } = await createDrizzleSupabaseClient();
    const { id } = await params;

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Verify ownership
    const tokenResults = await rls((db) =>
      db
        .select()
        .from(automation_tokens)
        .where(
          and(
            eq(automation_tokens.id, id),
            eq(automation_tokens.user_id, userData.user.id)
          )
        )
        .limit(1)
    );

    if (tokenResults.length === 0) {
      return NextResponse.json(
        { message: "Token not found" },
        { status: 404 }
      );
    }

    const token = tokenResults[0];

    if (token.revoked) {
      return NextResponse.json(
        { message: "Token is already revoked" },
        { status: 400 }
      );
    }

    // Revoke token
    await rls((db) =>
      db
        .update(automation_tokens)
        .set({
          revoked: true,
          revoked_at: new Date(),
        })
        .where(eq(automation_tokens.id, id))
    );

    return NextResponse.json(
      { message: "Token revoked successfully" },
      { status: 200 }
    );
  } catch (err: unknown) {
    console.error("Token revocation error:", err);
    return NextResponse.json(
      { message: "Internal server error", error: String(err) },
      { status: 500 }
    );
  }
};
