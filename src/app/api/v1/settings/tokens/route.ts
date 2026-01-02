import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { NextResponse } from "next/server";
import { automation_tokens } from "@/db/schema";
import { createDrizzleSupabaseClient } from "@/lib/drizzle";
import { generateToken, hashToken } from "@/lib/token-utils";

const createTokenSchema = z.object({
  name: z
    .string()
    .min(1, "Token name is required")
    .max(100, "Token name must be at most 100 characters"),
});

export const POST = async (request: Request) => {
  try {
    const { db, supabase } = await createDrizzleSupabaseClient();

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validation = createTokenSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { message: "Invalid request body", errors: validation.error.issues },
        { status: 400 }
      );
    }

    const { name } = validation.data;

    // Check for duplicate token name
    const existingToken = await db
      .select()
      .from(automation_tokens)
      .where(
        and(
          eq(automation_tokens.user_id, userData.user.id),
          eq(automation_tokens.name, name)
        )
      )
      .limit(1);

    if (existingToken.length > 0) {
      return NextResponse.json(
        { message: "Token name already exists" },
        { status: 409 }
      );
    }

    // Create token record with temporary hash
    const [tokenRecord] = await db
      .insert(automation_tokens)
      .values({
        user_id: userData.user.id,
        name,
        token_hash: "temp",
        revoked: false,
      })
      .returning({ id: automation_tokens.id });

    // Generate actual token
    const token = generateToken(userData.user.id, tokenRecord.id);
    const tokenHash = hashToken(token);

    // Update with actual hash
    await db
      .update(automation_tokens)
      .set({ token_hash: tokenHash })
      .where(eq(automation_tokens.id, tokenRecord.id));

    return NextResponse.json(
      {
        message: "Token created successfully",
        token: {
          id: tokenRecord.id,
          name,
          token,
          created_at: new Date(),
        },
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    console.error("Token creation error:", err);
    return NextResponse.json(
      { message: "Internal server error", error: String(err) },
      { status: 500 }
    );
  }
};

export const GET = async () => {
  try {
    const { db, supabase } = await createDrizzleSupabaseClient();

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const tokens = await db
      .select({
        id: automation_tokens.id,
        name: automation_tokens.name,
        revoked: automation_tokens.revoked,
        created_at: automation_tokens.created_at,
        revoked_at: automation_tokens.revoked_at,
      })
      .from(automation_tokens)
      .where(eq(automation_tokens.user_id, userData.user.id));

    return NextResponse.json(
      {
        tokens: tokens.map((t) => ({
          id: t.id,
          name: t.name,
          status: t.revoked ? "revoked" : "active",
          created_at: t.created_at,
          revoked_at: t.revoked_at,
        })),
      },
      { status: 200 }
    );
  } catch (err: unknown) {
    console.error("Token fetch error:", err);
    return NextResponse.json(
      { message: "Internal server error", error: String(err) },
      { status: 500 }
    );
  }
};
