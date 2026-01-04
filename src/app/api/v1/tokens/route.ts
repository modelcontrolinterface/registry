import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { api_tokens } from "@/db/schema";
import { NextResponse } from "next/server";
import { generateApiToken, hashToken } from "@/lib/utils";
import { createDrizzleSupabaseClient } from "@/lib/drizzle";

const createTokenSchema = z.object({
  name: z
    .string()
    .min(1, "Token name is required")
    .max(100, "Token name must be at most 100 characters"),
  expires_at: z.iso
    .date()
    .optional()
    .refine((val) => {
      if (!val) return true;

      const todayStart = new Date();
      const expirationDate = new Date(val);

      todayStart.setHours(0, 0, 0, 0);

      const tomorrowStart = new Date(todayStart);

      tomorrowStart.setDate(todayStart.getDate() + 1);

      return expirationDate >= tomorrowStart;
    }, "Expiration date must be at least tomorrow's date"),
});

export const POST = async (request: Request) => {
  try {
    const { rls, supabase } = await createDrizzleSupabaseClient();
    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData?.user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validation = createTokenSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { message: "Invalid request body", errors: validation.error.issues },
        { status: 400 },
      );
    }

    const { name, expires_at } = validation.data;

    const existingToken = await rls((db) =>
      db
        .select()
        .from(api_tokens)
        .where(
          and(
            eq(api_tokens.name, name),
            eq(api_tokens.user_id, userData.user.id),
          ),
        )
        .limit(1),
    );
    if (existingToken.length > 0) {
      return NextResponse.json(
        { message: "Token name already exists" },
        { status: 409 },
      );
    }

    const tokenRecords = await rls((db) =>
      db
        .insert(api_tokens)
        .values({
          name,
          user_id: userData.user.id,
          token_hash: "temp",
          expires_at: expires_at ? new Date(expires_at) : null,
        })
        .returning({ id: api_tokens.id }),
    );

    const [tokenRecord] = tokenRecords;

    const { token, hashedToken } = generateApiToken();
    await rls((db) =>
      db
        .update(api_tokens)
        .set({ token_hash: hashedToken })
        .where(eq(api_tokens.id, tokenRecord.id)),
    );

    return NextResponse.json(
      {
        message: "Token created successfully",
        token: {
          id: tokenRecord.id,
          name,
          token,
          created_at: new Date(),
          expires_at: expires_at ? new Date(expires_at) : null,
        },
      },
      { status: 201 },
    );
  } catch (err: unknown) {
    return NextResponse.json(
      { message: "Internal server error", error: String(err) },
      { status: 500 },
    );
  }
};

export const GET = async () => {
  try {
    const { rls, supabase } = await createDrizzleSupabaseClient();
    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData?.user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const tokens = await rls((db) =>
      db
        .select({
          id: api_tokens.id,
          name: api_tokens.name,
          created_at: api_tokens.created_at,
          expires_at: api_tokens.expires_at,
        })
        .from(api_tokens)
        .where(eq(api_tokens.user_id, userData.user.id)),
    );

    return NextResponse.json(
      {
        tokens: tokens.map((t) => ({
          id: t.id,
          name: t.name,
          created_at: t.created_at,
          expires_at: t.expires_at,
        })),
      },
      { status: 200 },
    );
  } catch (err: unknown) {
    return NextResponse.json(
      { message: "Internal server error", error: String(err) },
      { status: 500 },
    );
  }
};
