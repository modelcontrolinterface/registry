import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { api_tokens } from "@/db/schema";
import { NextResponse, NextRequest } from "next/server";
import { generateApiToken } from "@/lib/utils";
import { createDrizzleSupabaseClient } from "@/lib/drizzle";

const createTokenSchema = z.object({
  name: z
    .string()
    .min(1, "Token name is required")
    .max(100, "Token name must be at most 100 characters"),
  expires_at: z
    .string()
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

export const POST = async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  try {
    const { id: user_id_from_path } = await params;
    const authenticatedUserId = request.headers.get("x-user-id");

    if (authenticatedUserId !== user_id_from_path) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const { rls } = await createDrizzleSupabaseClient();
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
            eq(api_tokens.user_id, user_id_from_path),
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

    const { token, hashedToken } = generateApiToken();

    await rls((db) =>
      db.insert(api_tokens).values({
        name,
        user_id: user_id_from_path,
        token_hash: hashedToken,
        expires_at: expires_at ? new Date(expires_at) : null,
      }),
    );

    return NextResponse.json(
      {
        message: "Token created successfully",
        token: token,
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

export const GET = async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  try {
    const { id: user_id_from_path } = await params;
    const authenticatedUserId = request.headers.get("x-user-id");

    if (authenticatedUserId !== user_id_from_path) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const { rls } = await createDrizzleSupabaseClient();
    const tokens = await rls((db) =>
      db
        .select({
          id: api_tokens.id,
          name: api_tokens.name,
          created_at: api_tokens.created_at,
          expires_at: api_tokens.expires_at,
        })
        .from(api_tokens)
        .where(eq(api_tokens.user_id, user_id_from_path)),
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
