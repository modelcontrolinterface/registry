import { z } from "zod";
import { NextResponse } from "next/server";
import { eq, and, desc } from "drizzle-orm";
import { api_tokens, users } from "@/db/schema";
import { createDrizzleSupabaseClient } from "@/lib/drizzle";
import crypto from "crypto";

// Helper function to generate a secure API token
function generateApiToken(): string {
  return crypto.randomBytes(32).toString("hex"); // 32 bytes = 64 hex characters
}

// Helper function to hash the API token
function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

const createApiTokenSchema = z.object({
  name: z
    .string()
    .min(1, "Token name is required")
    .max(100, "Token name cannot exceed 100 characters"),
  expires_at: z.string().datetime().optional(), // ISO 8601 string
});

export const GET = async (
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) => {
  try {
    const { rls, supabase } = await createDrizzleSupabaseClient();
    const { id: user_id } = await params;

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    if (userData.user.id !== user_id) {
      return NextResponse.json(
        { message: "Forbidden: You can only view your own API tokens" },
        { status: 403 },
      );
    }

    const tokens = await rls((db) =>
      db.query.api_tokens.findMany({
        where: eq(api_tokens.user_id, user_id),
        columns: {
          id: true,
          name: true,
          created_at: true,
          expires_at: true,
        },
        orderBy: desc(api_tokens.created_at),
      }),
    );

    return NextResponse.json({ tokens }, { status: 200 });
  } catch (err: unknown) {
    console.error("Error fetching API tokens:", err);
    return NextResponse.json(
      { message: "Internal server error", error: String(err) },
      { status: 500 },
    );
  }
};

export const POST = async (
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) => {
  try {
    const { rls, supabase } = await createDrizzleSupabaseClient();
    const { id: user_id } = await params;
    const body = await request.json();

    const validation = createApiTokenSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { message: "Invalid request body", errors: validation.error.issues },
        { status: 400 },
      );
    }

    const { name, expires_at } = validation.data;

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    if (userData.user.id !== user_id) {
      return NextResponse.json(
        { message: "Forbidden: You can only create API tokens for your own account" },
        { status: 403 },
      );
    }

    const rawToken = generateApiToken();
    const hashedToken = hashToken(rawToken);

    const newApiToken = await rls((db) =>
      db
        .insert(api_tokens)
        .values({
          user_id,
          name,
          token_hash: hashedToken,
          expires_at: expires_at ? new Date(expires_at) : null,
        })
        .returning({
          id: api_tokens.id,
          name: api_tokens.name,
          created_at: api_tokens.created_at,
          expires_at: api_tokens.expires_at,
        }),
    );

    if (newApiToken.length === 0) {
      return NextResponse.json(
        { message: "Failed to create API token" },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        message: "API token created successfully. Store this token securely, it will not be shown again.",
        token: rawToken, // Return the raw token ONLY ONCE
        token_details: newApiToken[0],
      },
      { status: 201 },
    );
  } catch (err: unknown) {
    console.error("Error creating API token:", err);
    return NextResponse.json(
      { message: "Internal server error", error: String(err) },
      { status: 500 },
    );
  }
};
