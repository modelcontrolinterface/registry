CREATE TABLE IF NOT EXISTS "automation_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"token_hash" varchar(255) NOT NULL,
	"revoked" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revoked_at" timestamp with time zone,
	CONSTRAINT "automation_tokens_user_id_name_unique" UNIQUE("user_id","name"),
	CONSTRAINT "automation_tokens_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade
);

ALTER TABLE "automation_tokens" ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS "automation_tokens_user_id_idx" ON "automation_tokens" ("user_id");

CREATE INDEX IF NOT EXISTS "automation_tokens_revoked_idx" ON "automation_tokens" ("revoked");

DROP POLICY IF EXISTS "automation_tokens_select_own" ON "automation_tokens";
DROP POLICY IF EXISTS "automation_tokens_insert_own" ON "automation_tokens";
DROP POLICY IF EXISTS "automation_tokens_delete_own" ON "automation_tokens";
DROP POLICY IF EXISTS "automation_tokens_admin_all" ON "automation_tokens";

CREATE POLICY "automation_tokens_select_own" ON "automation_tokens" FOR SELECT TO "authenticated" USING (auth.uid() = user_id);

CREATE POLICY "automation_tokens_insert_own" ON "automation_tokens" FOR INSERT TO "authenticated" WITH CHECK (auth.uid() = user_id);

CREATE POLICY "automation_tokens_delete_own" ON "automation_tokens" FOR DELETE TO "authenticated" USING (auth.uid() = user_id);

CREATE POLICY "automation_tokens_admin_all" ON "automation_tokens" FOR ALL TO "package_admin" USING (true) WITH CHECK (true);
