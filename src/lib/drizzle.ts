import postgres from "postgres";
import * as schema from "@/db/schema";
import { drizzle } from "drizzle-orm/postgres-js";
import { createClient } from "@/lib/supabase/server";

export const createDrizzleSupabaseClient = async () => {
  const supabase = await createClient();
  const rls = async <T>(
    fn: (tx: ReturnType<typeof drizzle<typeof schema>>) => Promise<T>,
  ): Promise<T> => {
    const client = postgres(process.env.DATABASE_URL!, {
      ssl: "require",
      transform: postgres.camel,
    });
    const db = drizzle(client, { schema });

    try {
      return await fn(db);
    } finally {
      await client.end();
    }
  };

  return { supabase, rls };
};
