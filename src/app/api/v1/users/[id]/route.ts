import { z } from "zod";
import { users } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import * as schema from "@/db/schema";
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
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

const updateUserSchema = z.object({
  display_name: z
    .string()
    .min(1, "Display name cannot be empty")
    .max(64, "Display name cannot exceed 64 characters")
    .optional(),
  email: z.email("Invalid email format").optional(),
});

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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { rls, supabase } = await createDrizzleSupabaseClient();

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
      email?: string;
      updated_at: Date;
      display_name?: string;
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

    const ownedPackages = await rls((db) =>
      db
        .select({ count: sql<number>`count(*)` })
        .from(schema.packages)
        .where(eq(schema.packages.primary_owner_id, id)),
    );

    if (ownedPackages[0].count > 0) {
      return NextResponse.json(
        {
          message:
            "You cannot delete your account because you are the primary owner of one or more packages. Please transfer ownership or delete them first.",
        },
        { status: 400 },
      );
    }

    const adminSupabase = createAdminClient();
    const { error: deleteError } =
      await adminSupabase.auth.admin.deleteUser(id);

    if (deleteError) {
      throw new Error(deleteError.message);
    }

    const deletedUsers = await rls((db) =>
      db.delete(users).where(eq(users.id, id)).returning(),
    );

    if (deletedUsers.length === 0) {
      throw new Error("Failed to delete user record from local database.");
    }

    return NextResponse.json(
      { message: "Account deleted successfully" },
      { status: 200 },
    );
  } catch (err: unknown) {
    const errorMessage =
      err instanceof Error ? err.message : "An unknown error occurred";
    return NextResponse.json(
      { message: "Internal server error", error: errorMessage },
      { status: 500 },
    );
  }
}
