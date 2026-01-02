import crypto from "crypto";
import jwt from "jsonwebtoken";

const TOKEN_SECRET = process.env.JWT_SECRET || "your-secret-key";
const TOKEN_EXPIRY = "30d";

export interface TokenPayload {
  userId: string;
  tokenId: string;
  type: "automation";
}

/**
 * Hash a token for secure storage
 */
export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/**
 * Generate a new JWT automation token
 */
export function generateToken(userId: string, tokenId: string): string {
  const payload: TokenPayload = {
    userId,
    tokenId,
    type: "automation",
  };

  return jwt.sign(payload, TOKEN_SECRET, {
    expiresIn: TOKEN_EXPIRY,
    algorithm: "HS256",
  });
}

/**
 * Verify and decode a JWT token
 */
export function verifyToken(token: string): TokenPayload | null {
  try {
    const decoded = jwt.verify(token, TOKEN_SECRET, {
      algorithms: ["HS256"],
    }) as TokenPayload;

    if (decoded.type !== "automation") {
      return null;
    }

    return decoded;
  } catch (error) {
    return null;
  }
}
