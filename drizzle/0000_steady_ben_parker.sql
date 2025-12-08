CREATE TYPE "public"."audit_action" AS ENUM('service_verify', 'service_unverify', 'service_deprecate', 'service_undeprecate', 'service_transfer_ownership', 'version_yank', 'version_unyank', 'version_update', 'version_publish');--> statement-breakpoint
CREATE TYPE "public"."service_type" AS ENUM('server', 'sandbox', 'interceptor');--> statement-breakpoint
CREATE ROLE "service_admin";--> statement-breakpoint
CREATE TABLE "audits" (
	"id" serial PRIMARY KEY NOT NULL,
	"action" "audit_action" NOT NULL,
	"user_id" uuid NOT NULL,
	"service_id" varchar(100) NOT NULL,
	"service_version_id" uuid,
	"timestamp" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "audits" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "service_owners" (
	"service_id" varchar(100) NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "service_owners_service_id_user_id_pk" PRIMARY KEY("service_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "service_owners" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "service_version_contributors" (
	"service_id" varchar(100) NOT NULL,
	"service_version_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "service_version_contributors_service_id_service_version_id_user_id_pk" PRIMARY KEY("service_id","service_version_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "service_version_contributors" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "service_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"service_id" varchar(100) NOT NULL,
	"version" varchar(30) NOT NULL,
	"is_stable" boolean DEFAULT false NOT NULL,
	"size" bigint NOT NULL,
	"publisher_id" uuid NOT NULL,
	"license" text[],
	"yanked" boolean DEFAULT false NOT NULL,
	"yanked_message" varchar(200),
	"yanked_at" timestamp with time zone,
	"yanked_by_user_id" uuid,
	"downloads" bigint DEFAULT 0 NOT NULL,
	"readme_url" text NOT NULL,
	"integrity" varchar(100) NOT NULL,
	"tarball" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "service_versions_id_service_id_unique" UNIQUE("id","service_id")
);
--> statement-breakpoint
ALTER TABLE "service_versions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "services" (
	"id" varchar(100) PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"type" "service_type" NOT NULL,
	"primary_owner" uuid NOT NULL,
	"default_version" uuid,
	"keywords" text[] DEFAULT ARRAY[]::text[],
	"description" varchar(500),
	"homepage" text,
	"repository" text,
	"is_verified" boolean DEFAULT false NOT NULL,
	"is_deprecated" boolean DEFAULT false NOT NULL,
	"deprecation_message" varchar(500),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "services_id_format" CHECK ("services"."id" ~ '^[a-z0-9-]+$')
);
--> statement-breakpoint
ALTER TABLE "services" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY NOT NULL,
	"email" varchar(150) NOT NULL,
	"username" varchar(50) NOT NULL,
	"display_name" varchar(100) NOT NULL,
	"avatar_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "audits" ADD CONSTRAINT "audits_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audits" ADD CONSTRAINT "audits_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audits" ADD CONSTRAINT "audits_service_version_id_service_versions_id_fk" FOREIGN KEY ("service_version_id") REFERENCES "public"."service_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_owners" ADD CONSTRAINT "service_owners_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_owners" ADD CONSTRAINT "service_owners_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_version_contributors" ADD CONSTRAINT "service_version_contributors_service_version_id_service_versions_id_fk" FOREIGN KEY ("service_version_id") REFERENCES "public"."service_versions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_version_contributors" ADD CONSTRAINT "service_version_contributors_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_versions" ADD CONSTRAINT "service_versions_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_versions" ADD CONSTRAINT "service_versions_publisher_id_users_id_fk" FOREIGN KEY ("publisher_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_versions" ADD CONSTRAINT "service_versions_yanked_by_user_id_users_id_fk" FOREIGN KEY ("yanked_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "services" ADD CONSTRAINT "services_primary_owner_users_id_fk" FOREIGN KEY ("primary_owner") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audits_timestamp_idx" ON "audits" USING btree ("timestamp" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "service_versions_created_at_idx" ON "service_versions" USING btree ("created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "services_updated_at_idx" ON "services" USING btree ("updated_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "services_type_idx" ON "services" USING btree ("type");--> statement-breakpoint
CREATE POLICY "audits_select_public" ON "audits" AS PERMISSIVE FOR SELECT TO public USING (true);--> statement-breakpoint
CREATE POLICY "audits_admin_all" ON "audits" AS PERMISSIVE FOR ALL TO "service_admin" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "service_owners_select_public" ON "service_owners" AS PERMISSIVE FOR SELECT TO public USING (true);--> statement-breakpoint
CREATE POLICY "service_owners_insert" ON "service_owners" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (
        EXISTS (
          SELECT 1 FROM services s
          WHERE s.id = "service_owners"."service_id" AND
            (s.primary_owner = (select auth.uid())
              OR EXISTS (
                SELECT 1 FROM service_owners so
                WHERE so.service_id = "service_owners"."service_id" AND so.user_id = (select auth.uid())
              )
            )
        )
      );--> statement-breakpoint
CREATE POLICY "service_owners_delete" ON "service_owners" AS PERMISSIVE FOR DELETE TO "authenticated" USING (
        EXISTS (
          SELECT 1 FROM services s
          WHERE s.id = "service_owners"."service_id" AND
            (s.primary_owner = (select auth.uid())
              OR EXISTS (
                SELECT 1 FROM service_owners so
                WHERE so.service_id = "service_owners"."service_id" AND so.user_id = (select auth.uid())
              )
            )
        )
      );--> statement-breakpoint
CREATE POLICY "service_owners_admin_all" ON "service_owners" AS PERMISSIVE FOR ALL TO "service_admin" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "service_version_contributors_select_public" ON "service_version_contributors" AS PERMISSIVE FOR SELECT TO public USING (true);--> statement-breakpoint
CREATE POLICY "svc_version_contrib_insert" ON "service_version_contributors" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (
        EXISTS (
          SELECT 1 FROM services s
          WHERE s.id = "service_version_contributors"."service_id" AND
            (s.primary_owner = (select auth.uid())
              OR EXISTS (
                SELECT 1 FROM service_owners so
                WHERE so.service_id = "service_version_contributors"."service_id" AND so.user_id = (select auth.uid())
              )
            )
        )
      );--> statement-breakpoint
CREATE POLICY "svc_version_contrib_delete" ON "service_version_contributors" AS PERMISSIVE FOR DELETE TO "authenticated" USING (
        EXISTS (
          SELECT 1 FROM services s
          WHERE s.id = "service_version_contributors"."service_id" AND
            (s.primary_owner = (select auth.uid())
              OR EXISTS (
                SELECT 1 FROM service_owners so
                WHERE so.service_id = "service_version_contributors"."service_id" AND so.user_id = (select auth.uid())
              )
            )
        )
      );--> statement-breakpoint
CREATE POLICY "service_versions_select_public" ON "service_versions" AS PERMISSIVE FOR SELECT TO public USING (true);--> statement-breakpoint
CREATE POLICY "service_versions_insert_owner" ON "service_versions" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (
        EXISTS (
          SELECT 1 FROM services s
          WHERE s.id = "service_versions"."service_id" AND
            (s.primary_owner = (select auth.uid())
              OR EXISTS (
                SELECT 1 FROM service_owners so
                WHERE so.service_id = "service_versions"."service_id" AND so.user_id = (select auth.uid())
              )
            )
        )
      );--> statement-breakpoint
CREATE POLICY "service_versions_update_owner" ON "service_versions" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (
        EXISTS (
          SELECT 1 FROM services s
          WHERE s.id = "service_versions"."service_id" AND
            (s.primary_owner = (select auth.uid())
              OR EXISTS (
                SELECT 1 FROM service_owners so
                WHERE so.service_id = "service_versions"."service_id" AND so.user_id = (select auth.uid())
              )
            )
        )
        AND (
          "service_versions"."service_id" IS NOT DISTINCT FROM new.service_id AND
          "service_versions"."version" IS NOT DISTINCT FROM new.version AND
          "service_versions"."size" IS NOT DISTINCT FROM new.size AND
          "service_versions"."publisher_id" IS NOT DISTINCT FROM new.publisher_id AND
          "service_versions"."license" IS NOT DISTINCT FROM new.license AND
          "service_versions"."integrity" IS NOT DISTINCT FROM new.integrity AND
          "service_versions"."tarball" IS NOT DISTINCT FROM new.tarball
        )
      ) WITH CHECK (
        EXISTS (
          SELECT 1 FROM services s
          WHERE s.id = "service_versions"."service_id" AND
            (s.primary_owner = (select auth.uid())
              OR EXISTS (
                SELECT 1 FROM service_owners so
                WHERE so.service_id = "service_versions"."service_id" AND so.user_id = (select auth.uid())
              )
            )
        )
      );--> statement-breakpoint
CREATE POLICY "service_versions_admin_all" ON "service_versions" AS PERMISSIVE FOR ALL TO "service_admin" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "services_select_public" ON "services" AS PERMISSIVE FOR SELECT TO public USING (true);--> statement-breakpoint
CREATE POLICY "services_insert_authenticated" ON "services" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((select auth.uid()) IS NOT NULL AND (select auth.uid()) = "services"."primary_owner");--> statement-breakpoint
CREATE POLICY "services_update_owners" ON "services" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (
        (
          (select auth.uid()) = "services"."primary_owner" OR
          EXISTS (
            SELECT 1 FROM service_owners so
            WHERE so.service_id = "services"."id" AND so.user_id = (select auth.uid())
          )
        ) AND (
          current_setting('role') = 'service_admin' OR
          ("services"."is_verified" IS NOT DISTINCT FROM new.is_verified)
        )
      ) WITH CHECK (
        (
          (select auth.uid()) = "services"."primary_owner" OR
          EXISTS (
            SELECT 1 FROM service_owners so
            WHERE so.service_id = "services"."id" AND so.user_id = (select auth.uid())
          )
        ) AND (
          current_setting('role') = 'service_admin' OR
          ("services"."is_verified" IS NOT DISTINCT FROM new.is_verified)
        )
      );--> statement-breakpoint
CREATE POLICY "services_delete_primary_owner" ON "services" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((select auth.uid()) = "services"."primary_owner");--> statement-breakpoint
CREATE POLICY "services_admin_all" ON "services" AS PERMISSIVE FOR ALL TO "service_admin" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "users_select_public" ON "users" AS PERMISSIVE FOR SELECT TO public USING (true);--> statement-breakpoint
CREATE POLICY "users_update_own" ON "users" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((select auth.uid()) = id) WITH CHECK ((select auth.uid()) = id);