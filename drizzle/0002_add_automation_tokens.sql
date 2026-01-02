CREATE TABLE "automation_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"token_hash" varchar(255) NOT NULL,
	"revoked" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revoked_at" timestamp with time zone,
	CONSTRAINT "automation_tokens_user_id_name_unique" UNIQUE("user_id","name")
);
--> statement-breakpoint
ALTER TABLE "automation_tokens" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE INDEX "automation_tokens_user_id_idx" ON "automation_tokens" ("user_id");
--> statement-breakpoint
CREATE INDEX "automation_tokens_revoked_idx" ON "automation_tokens" ("revoked");
--> statement-breakpoint
ALTER TABLE "automation_tokens" ADD CONSTRAINT "automation_tokens_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE POLICY "automation_tokens_select_own" ON "automation_tokens" FOR SELECT TO "authenticated" USING (auth.uid() = user_id);
--> statement-breakpoint
CREATE POLICY "automation_tokens_insert_own" ON "automation_tokens" FOR INSERT TO "authenticated" WITH CHECK (auth.uid() = user_id);
--> statement-breakpoint
CREATE POLICY "automation_tokens_delete_own" ON "automation_tokens" FOR DELETE TO "authenticated" USING (auth.uid() = user_id);
--> statement-breakpoint
CREATE POLICY "automation_tokens_admin_all" ON "automation_tokens" FOR ALL TO "package_admin" USING (true) WITH CHECK (true);
