import "dotenv/config";
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  strict: true,
  verbose: true,
  out: "./drizzle",
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  introspect: {
    casing: "preserve",
  },
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  entities: {
    roles: {
      provider: "supabase",
      include: ["service_admin"],
    },
  },
});
