import { hashToken } from "./utils";
import { api_tokens, users } from "@/db/schema";
import { eq, and, isNull, gt } from "drizzle-orm";
import { createDrizzleSupabaseClient } from "@/lib/drizzle";

export interface AuthenticatedUser {
  id: string;
  email: string;
}

export async function authenticateWithToken(
  token: string,
): Promise<AuthenticatedUser | null> {
  const { rls } = await createDrizzleSupabaseClient();

  const now = new Date();
  const hashedToken = hashToken(token);

  const storedTokenRecord = await rls((db) =>
    db
      .select({
        id: api_tokens.id,
        user_id: api_tokens.user_id,
        expires_at: api_tokens.expires_at,
      })
      .from(api_tokens)
      .where(
        and(
          eq(api_tokens.token_hash, hashedToken),
          and(
            api_tokens.expires_at
              ? gt(api_tokens.expires_at, now)
              : isNull(api_tokens.expires_at),
          ),
        ),
      )
      .limit(1),
  );

  if (storedTokenRecord.length === 0) {
    return null;
  }

  const tokenRecord = storedTokenRecord[0];

  const userResults = await rls((db) =>
    db
      .select({
        id: users.id,
        email: users.email,
      })
      .from(users)
      .where(eq(users.id, tokenRecord.user_id))
      .limit(1),
  );

  if (userResults.length === 0) {
    return null;
  }

  return userResults[0];
}

export function extractTokenFromHeader(
  authHeader: string | null,
): string | null {
  if (!authHeader) {
    return null;
  }

  const parts = authHeader.split(" ");
  if (parts.length !== 2 || parts[0] !== "Bearer") {
    return null;
  }

  return parts[1];
}
