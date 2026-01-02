import { z } from "zod";
import { eq } from "drizzle-orm";
import { users } from "@/db/schema";
import * as schema from "@/db/schema";
import { NextRequest, NextResponse } from "next/server";
import { createDrizzleSupabaseClient } from "@/lib/drizzle";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";

type DbClient = PostgresJsDatabase<typeof schema>;

interface GetUserReturn {
  user: typeof users.$inferSelect;
}

export type GetUserResult = GetUserReturn | null;

const getUser = async (
  db: DbClient,
  id: string,
): Promise<GetUserReturn | null> => {
  const user = await db.query.users.findFirst({ where: eq(users.id, id) });

  if (!user) {
    return null;
  }

  return { user };
};

export async function GET(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { rls } = await createDrizzleSupabaseClient();

  const user = await rls((db) => getUser(db, id));

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json(user);
}

const updateUserSchema = z.object({
  display_name: z
    .string()
    .min(1, "Display name cannot be empty")
    .max(64, "Display name cannot exceed 64 characters")
    .optional(),
  email: z.email("Invalid email format").optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { rls, supabase } = await createDrizzleSupabaseClient();
    const body = await request.json();

    const validation = updateUserSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { message: "Invalid request body", errors: validation.error.issues },
        { status: 400 },
      );
    }

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    if (userData.user.id !== id) {
      return NextResponse.json(
        { message: "Forbidden: You can only update your own profile" },
        { status: 403 },
      );
    }

    const updateData: {
      display_name?: string;
      email?: string;
      updated_at: Date;
    } = {
      updated_at: new Date(),
    };

    if (validation.data.display_name !== undefined) {
      updateData.display_name = validation.data.display_name;
    }
    if (validation.data.email !== undefined) {
      updateData.email = validation.data.email;
    }

    const updatedUsers = await rls((db) =>
      db.update(users).set(updateData).where(eq(users.id, id)).returning(),
    );

    if (updatedUsers.length === 0) {
      return NextResponse.json(
        { message: "Failed to update user profile" },
        { status: 500 },
      );
    }

    return NextResponse.json(updatedUsers[0], { status: 200 });
  } catch (err: unknown) {
    return NextResponse.json(
      { message: "Internal server error", error: String(err) },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { rls, supabase } = await createDrizzleSupabaseClient();

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    if (userData.user.id !== id) {
      return NextResponse.json(
        { message: "Forbidden: You can only delete your own profile" },
        { status: 403 },
      );
    }

    const deletedUsers = await rls((db) =>
      db.delete(users).where(eq(users.id, id)).returning(),
    );

    if (deletedUsers.length === 0) {
      return NextResponse.json(
        { message: "Failed to delete user profile or user not found" },
        { status: 500 },
      );
    }

    return NextResponse.json(
      { message: `User '${id}' deleted successfully` },
      { status: 200 },
    );
  } catch (err: unknown) {
    return NextResponse.json(
      { message: "Internal server error", error: String(err) },
      { status: 500 },
    );
  }
}
