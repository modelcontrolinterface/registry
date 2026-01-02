import { eq } from "drizzle-orm";
import { automation_tokens, users } from "@/db/schema";
import { createDrizzleSupabaseClient } from "@/lib/drizzle";
import { verifyToken } from "./token-utils";

export interface AuthenticatedUser {
  id: string;
  email: string;
}

/**
 * Authenticate using JWT automation token
 */
export async function authenticateWithToken(
  token: string
): Promise<AuthenticatedUser | null> {
  const payload = verifyToken(token);
  if (!payload) {
    return null;
  }

  const { db } = await createDrizzleSupabaseClient();

  // Check if token exists and is not revoked
  const tokenResults = await db
    .select({
      id: automation_tokens.id,
      user_id: automation_tokens.user_id,
      revoked: automation_tokens.revoked,
    })
    .from(automation_tokens)
    .where(eq(automation_tokens.id, payload.tokenId))
    .limit(1);

  if (tokenResults.length === 0 || tokenResults[0].revoked) {
    return null;
  }

  const tokenRecord = tokenResults[0];

  // Get user info
  const userResults = await db
    .select({
      id: users.id,
      email: users.email,
    })
    .from(users)
    .where(eq(users.id, tokenRecord.user_id))
    .limit(1);

  if (userResults.length === 0) {
    return null;
  }

  return userResults[0];
}

/**
 * Extract token from Authorization header
 */
export function extractTokenFromHeader(authHeader: string | null): string | null {
  if (!authHeader) {
    return null;
  }

  const parts = authHeader.split(" ");
  if (parts.length !== 2 || parts[0] !== "Bearer") {
    return null;
  }

  return parts[1];
}
