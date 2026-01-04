import { eq } from "drizzle-orm";
import { automation_tokens, users } from "@/db/schema";
import { createDrizzleSupabaseClient } from "@/lib/drizzle";
import { hashToken, verifyApiToken } from "./utils"; // Updated import

export interface AuthenticatedUser {
  id: string;
  email: string;
}

/**
 * Authenticate using API token
 * NOTE: This is a placeholder implementation. The full logic for
 * retrieving the stored hashed token and verifying against it will
 * be implemented as part of the "Rework API Token Generation and Verification" task.
 */
export async function authenticateWithToken(
  token: string,
): Promise<AuthenticatedUser | null> {
  const { rls } = await createDrizzleSupabaseClient();

  // Placeholder: In a real scenario, you would extract a token identifier
  // from the 'token' string, query the database for the corresponding
  // stored hashed token, and then use verifyApiToken.
  // For now, we'll simulate a lookup.
  const storedTokenRecord = await rls((db) =>
    db
      .select({
        id: automation_tokens.id,
        user_id: automation_tokens.user_id,
        revoked: automation_tokens.revoked,
        token_hash: automation_tokens.token_hash, // Assuming token_hash is available
      })
      .from(automation_tokens)
      .where(eq(automation_tokens.token_hash, hashToken(token))) // Simulating lookup by hash
      .limit(1),
  );

  if (
    storedTokenRecord.length === 0 ||
    storedTokenRecord[0].revoked ||
    !verifyApiToken(token, storedTokenRecord[0].token_hash)
  ) {
    return null;
  }

  const tokenRecord = storedTokenRecord[0];

  // Get user info
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

/**
 * Extract token from Authorization header
 */
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
