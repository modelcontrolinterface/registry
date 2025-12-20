CREATE TYPE "public"."audit_action" AS ENUM('package_verify', 'package_unverify', 'package_deprecate', 'package_undeprecate', 'package_transfer_ownership', 'version_yank', 'version_unyank', 'version_update', 'version_publish');--> statement-breakpoint
CREATE TYPE "public"."package_category" AS ENUM('server', 'sandbox', 'interceptor');--> statement-breakpoint
CREATE ROLE "package_admin";--> statement-breakpoint
CREATE TABLE "audits" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "audits_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"action" "audit_action" NOT NULL,
	"user_id" uuid,
	"package_id" varchar(100),
	"package_version_id" uuid,
	"version_number" varchar(100),
	"metadata" jsonb,
	"timestamp" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "audits" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "package_owners" (
	"package_id" varchar(100) NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "package_owners_package_id_user_id_pk" PRIMARY KEY("package_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "package_owners" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "package_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"package_id" varchar(100) NOT NULL,
	"version" varchar(100) NOT NULL,
	"publisher_id" uuid NOT NULL,
	"authors" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"license" varchar(100),
	"license_file" text,
	"yanked" boolean DEFAULT false NOT NULL,
	"yanked_at" timestamp with time zone,
	"yanked_message" varchar(200),
	"yanked_by_user_id" uuid,
	"readme" text NOT NULL,
	"changelog" text,
	"tarball" text NOT NULL,
	"abi_version" varchar(50) NOT NULL,
	"digest" varchar(100) NOT NULL,
	"size" bigint NOT NULL,
	"downloads" bigint DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "package_versions_package_version_unique" UNIQUE("package_id","version"),
	CONSTRAINT "package_versions_version_format" CHECK ("package_versions"."version" ~ '^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$'),
	CONSTRAINT "package_versions_yanked_consistency" CHECK (
        ("package_versions"."yanked" IS FALSE AND "package_versions"."yanked_at" IS NULL AND "package_versions"."yanked_by_user_id" IS NULL) OR 
        ("package_versions"."yanked" IS TRUE AND "package_versions"."yanked_at" IS NOT NULL AND "package_versions"."yanked_by_user_id" IS NOT NULL)
      ),
	CONSTRAINT "package_versions_license_specified" CHECK ("package_versions"."license" IS NOT NULL OR "package_versions"."license_file" IS NOT NULL),
	CONSTRAINT "package_versions_authors_format" CHECK (jsonb_typeof("package_versions"."authors") = 'array'),
	CONSTRAINT "package_versions_size_positive" CHECK ("package_versions"."size" > 0),
	CONSTRAINT "package_versions_downloads_non_negative" CHECK ("package_versions"."downloads" >= 0)
);
--> statement-breakpoint
ALTER TABLE "package_versions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "packages" (
	"id" varchar(100) PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"categories" "package_category"[] NOT NULL,
	"primary_owner" uuid NOT NULL,
	"default_version" varchar(100),
	"keywords" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"homepage" text,
	"repository" text,
	"description" varchar(500),
	"is_verified" boolean DEFAULT false NOT NULL,
	"is_deprecated" boolean DEFAULT false NOT NULL,
	"deprecation_message" varchar(500),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "packages_name_unique" UNIQUE("name"),
	CONSTRAINT "packages_id_format" CHECK ("packages"."id" ~ '^[a-z](?:[a-z0-9_-]{0,62}[a-z0-9])?$'),
	CONSTRAINT "packages_name_format" CHECK ("packages"."name" ~ '^[a-z](?:[a-z0-9_-]{0,62}[a-z0-9])?$'),
	CONSTRAINT "packages_keywords_format" CHECK (array_to_string("packages"."keywords", '') ~ '^[a-z0-9_-]*$'),
	CONSTRAINT "packages_keywords_max_length" CHECK (array_length("packages"."keywords", 1) <= 5),
	CONSTRAINT "packages_deprecation_consistency" CHECK ((NOT "packages"."is_deprecated") OR ("packages"."deprecation_message" IS NOT NULL)),
	CONSTRAINT "packages_default_version_format" CHECK ("packages"."default_version" IS NULL OR "packages"."default_version" ~ '^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$')
);
--> statement-breakpoint
ALTER TABLE "packages" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY NOT NULL,
	"email" varchar(150) NOT NULL,
	"display_name" varchar(100) NOT NULL,
	"avatar_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "audits" ADD CONSTRAINT "audits_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audits" ADD CONSTRAINT "audits_package_id_packages_id_fk" FOREIGN KEY ("package_id") REFERENCES "public"."packages"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audits" ADD CONSTRAINT "audits_package_version_id_package_versions_id_fk" FOREIGN KEY ("package_version_id") REFERENCES "public"."package_versions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "package_owners" ADD CONSTRAINT "package_owners_package_id_packages_id_fk" FOREIGN KEY ("package_id") REFERENCES "public"."packages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "package_owners" ADD CONSTRAINT "package_owners_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "package_versions" ADD CONSTRAINT "package_versions_package_id_packages_id_fk" FOREIGN KEY ("package_id") REFERENCES "public"."packages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "package_versions" ADD CONSTRAINT "package_versions_publisher_id_users_id_fk" FOREIGN KEY ("publisher_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "package_versions" ADD CONSTRAINT "package_versions_yanked_by_user_id_users_id_fk" FOREIGN KEY ("yanked_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "packages" ADD CONSTRAINT "packages_primary_owner_users_id_fk" FOREIGN KEY ("primary_owner") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audits_timestamp_idx" ON "audits" USING btree ("timestamp" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "audits_user_id_idx" ON "audits" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "audits_package_id_idx" ON "audits" USING btree ("package_id");--> statement-breakpoint
CREATE INDEX "audits_action_idx" ON "audits" USING btree ("action");--> statement-breakpoint
CREATE INDEX "package_owners_user_id_idx" ON "package_owners" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "package_owners_package_id_idx" ON "package_owners" USING btree ("package_id");--> statement-breakpoint
CREATE INDEX "package_versions_package_id_idx" ON "package_versions" USING btree ("package_id");--> statement-breakpoint
CREATE INDEX "package_versions_created_at_idx" ON "package_versions" USING btree ("created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "package_versions_version_idx" ON "package_versions" USING btree ("version");--> statement-breakpoint
CREATE INDEX "package_versions_yanked_idx" ON "package_versions" USING btree ("yanked");--> statement-breakpoint
CREATE INDEX "package_versions_publisher_id_idx" ON "package_versions" USING btree ("publisher_id");--> statement-breakpoint
CREATE INDEX "packages_name_idx" ON "packages" USING btree ("name");--> statement-breakpoint
CREATE INDEX "packages_primary_owner_idx" ON "packages" USING btree ("primary_owner");--> statement-breakpoint
CREATE INDEX "packages_updated_at_idx" ON "packages" USING btree ("updated_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "packages_categories_gin_idx" ON "packages" USING gin ("categories");--> statement-breakpoint
CREATE INDEX "packages_keywords_gin_idx" ON "packages" USING gin ("keywords");--> statement-breakpoint
CREATE INDEX "packages_is_verified_idx" ON "packages" USING btree ("is_verified");--> statement-breakpoint
CREATE INDEX "users_email_idx" ON "users" USING btree ("email");--> statement-breakpoint
CREATE POLICY "audits_select_public" ON "audits" AS PERMISSIVE FOR SELECT TO public USING (true);--> statement-breakpoint
CREATE POLICY "audits_insert_authenticated" ON "audits" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((select auth.uid()) = "audits"."user_id");--> statement-breakpoint
CREATE POLICY "audits_admin_all" ON "audits" AS PERMISSIVE FOR ALL TO "package_admin" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "package_owners_select_public" ON "package_owners" AS PERMISSIVE FOR SELECT TO public USING (true);--> statement-breakpoint
CREATE POLICY "package_owners_insert" ON "package_owners" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (
        EXISTS (
          SELECT 1 FROM packages p
          WHERE p.id = "package_owners"."package_id" AND
            (p.primary_owner = (select auth.uid()) OR
              EXISTS (
                SELECT 1 FROM package_owners po
                WHERE po.package_id = "package_owners"."package_id" AND po.user_id = (select auth.uid())
              )
            )
        )
      );--> statement-breakpoint
CREATE POLICY "package_owners_delete" ON "package_owners" AS PERMISSIVE FOR DELETE TO "authenticated" USING (
        EXISTS (
          SELECT 1 FROM packages p
          WHERE p.id = "package_owners"."package_id" AND
            (p.primary_owner = (select auth.uid()) OR
              EXISTS (
                SELECT 1 FROM package_owners po
                WHERE po.package_id = "package_owners"."package_id" AND po.user_id = (select auth.uid())
              )
            )
        )
      );--> statement-breakpoint
CREATE POLICY "package_owners_admin_all" ON "package_owners" AS PERMISSIVE FOR ALL TO "package_admin" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "package_versions_select_public" ON "package_versions" AS PERMISSIVE FOR SELECT TO public USING (true);--> statement-breakpoint
CREATE POLICY "package_versions_insert_owner" ON "package_versions" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (
        EXISTS (
          SELECT 1 FROM packages p
          WHERE p.id = "package_versions"."package_id" AND
            (p.primary_owner = (select auth.uid()) OR
              EXISTS (
                SELECT 1 FROM package_owners po
                WHERE po.package_id = "package_versions"."package_id" AND po.user_id = (select auth.uid())
              )
            )
        )
      );--> statement-breakpoint
CREATE POLICY "package_versions_update_owner" ON "package_versions" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (
        EXISTS (
          SELECT 1 FROM packages p
          WHERE p.id = "package_versions"."package_id" AND
            (p.primary_owner = (select auth.uid()) OR
              EXISTS (
                SELECT 1 FROM package_owners po
                WHERE po.package_id = "package_versions"."package_id" AND po.user_id = (select auth.uid())
              )
            )
        )
      ) WITH CHECK (
        EXISTS (
          SELECT 1 FROM packages p
          WHERE p.id = "package_versions"."package_id" AND
            (p.primary_owner = (select auth.uid()) OR
              EXISTS (
                SELECT 1 FROM package_owners po
                WHERE po.package_id = "package_versions"."package_id" AND po.user_id = (select auth.uid())
              )
            )
        ) AND
        "package_versions"."package_id" = (SELECT package_id FROM package_versions WHERE id = "package_versions"."id") AND
        "package_versions"."version" = (SELECT version FROM package_versions WHERE id = "package_versions"."id") AND
        "package_versions"."size" = (SELECT size FROM package_versions WHERE id = "package_versions"."id") AND
        "package_versions"."publisher_id" = (SELECT publisher_id FROM package_versions WHERE id = "package_versions"."id") AND
        "package_versions"."digest" = (SELECT digest FROM package_versions WHERE id = "package_versions"."id") AND
        "package_versions"."tarball" = (SELECT tarball FROM package_versions WHERE id = "package_versions"."id")
      );--> statement-breakpoint
CREATE POLICY "package_versions_admin_all" ON "package_versions" AS PERMISSIVE FOR ALL TO "package_admin" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "packages_select_public" ON "packages" AS PERMISSIVE FOR SELECT TO public USING (true);--> statement-breakpoint
CREATE POLICY "packages_insert_authenticated" ON "packages" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((select auth.uid()) IS NOT NULL AND (select auth.uid()) = "packages"."primary_owner");--> statement-breakpoint
CREATE POLICY "packages_update_owners" ON "packages" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (
        (select auth.uid()) = "packages"."primary_owner" OR
        EXISTS (
          SELECT 1 FROM package_owners po
          WHERE po.package_id = "packages"."id" AND po.user_id = (select auth.uid())
        )
      ) WITH CHECK (
        ((select auth.uid()) = "packages"."primary_owner" OR
        EXISTS (
          SELECT 1 FROM package_owners po
          WHERE po.package_id = "packages"."id" AND po.user_id = (select auth.uid())
        )) AND
        ("packages"."primary_owner" = (SELECT primary_owner FROM packages WHERE id = "packages"."id")) AND
        ("packages"."is_verified" = (SELECT is_verified FROM packages WHERE id = "packages"."id"))
      );--> statement-breakpoint
CREATE POLICY "packages_delete_primary_owner" ON "packages" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((select auth.uid()) = "packages"."primary_owner");--> statement-breakpoint
CREATE POLICY "packages_admin_all" ON "packages" AS PERMISSIVE FOR ALL TO "package_admin" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "users_select_public" ON "users" AS PERMISSIVE FOR SELECT TO public USING (true);--> statement-breakpoint
CREATE POLICY "users_update_own" ON "users" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((select auth.uid()) = "users"."id") WITH CHECK ((select auth.uid()) = "users"."id");