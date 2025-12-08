import { relations, sql } from "drizzle-orm";
import {
  text,
  uuid,
  index,
  check,
  pgRole,
  bigint,
  pgEnum,
  unique,
  serial,
  varchar,
  pgTable,
  boolean,
  pgPolicy,
  timestamp,
  primaryKey,
} from "drizzle-orm/pg-core";
import { authenticatedRole, authUid } from "drizzle-orm/supabase";

export const serviceTypeEnum = pgEnum("service_type", [
  "server",
  "sandbox",
  "interceptor",
]);

export const auditActionEnum = pgEnum("audit_action", [
  "service_verify",
  "service_unverify",
  "service_deprecate",
  "service_undeprecate",
  "service_transfer_ownership",

  "version_yank",
  "version_unyank",
  "version_update",
  "version_publish",
]);

export const adminRole = pgRole("service_admin");

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().notNull(),
    email: varchar("email", { length: 150 }).notNull(),
    username: varchar("username", { length: 50 }).notNull().unique(),
    display_name: varchar("display_name", { length: 100 }).notNull(),
    avatar_url: text("avatar_url"),
    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updated_at: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (_) => [
    pgPolicy("users_select_public", {
      for: "select",
      to: "public",
      using: sql`true`,
    }),
    pgPolicy("users_update_own", {
      for: "update",
      to: authenticatedRole,
      using: sql`${authUid} = id`,
      withCheck: sql`${authUid} = id`,
    }),
  ],
);

export const usersRelations = relations(users, ({ many }) => ({
  audits: many(audits),
  owned_services: many(service_owners),
  version_contributions: many(service_version_contributors),
  authored_versions: many(service_versions, { relationName: "author" }),
  published_versions: many(service_versions, { relationName: "published_by" }),
}));

export const services = pgTable(
  "services",
  {
    id: varchar("id", { length: 100 }).primaryKey(),
    name: varchar("name", { length: 100 }).notNull(),
    type: serviceTypeEnum("type").notNull(),
    primary_owner: uuid("primary_owner")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    default_version: uuid("default_version"),
    keywords: text("keywords")
      .array()
      .default(sql`ARRAY[]::text[]`),
    description: varchar("description", { length: 500 }),
    homepage: text("homepage"),
    repository: text("repository"),
    is_verified: boolean("is_verified").notNull().default(false),
    is_deprecated: boolean("is_deprecated").notNull().default(false),
    deprecation_message: varchar("deprecation_message", { length: 500 }),
    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updated_at: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index("services_updated_at_idx").on(t.updated_at.desc()),
    check("services_id_format", sql`${t.id} ~ '^[a-z0-9-]+$'`),
    index("services_type_idx").on(t.type),

    pgPolicy("services_select_public", {
      for: "select",
      to: "public",
      using: sql`true`,
    }),
    pgPolicy("services_insert_authenticated", {
      for: "insert",
      to: authenticatedRole,
      withCheck: sql`${authUid} IS NOT NULL AND ${authUid} = ${t.primary_owner}`,
    }),
    pgPolicy("services_update_owners", {
      for: "update",
      to: authenticatedRole,
      using: sql`
        (
          ${authUid} = ${t.primary_owner} OR
          EXISTS (
            SELECT 1 FROM service_owners so
            WHERE so.service_id = ${t.id} AND so.user_id = ${authUid}
          )
        ) AND (
          current_setting('role') = 'service_admin' OR
          (${t.is_verified} IS NOT DISTINCT FROM new.is_verified)
        )
      `,
      withCheck: sql`
        (
          ${authUid} = ${t.primary_owner} OR
          EXISTS (
            SELECT 1 FROM service_owners so
            WHERE so.service_id = ${t.id} AND so.user_id = ${authUid}
          )
        ) AND (
          current_setting('role') = 'service_admin' OR
          (${t.is_verified} IS NOT DISTINCT FROM new.is_verified)
        )
      `,
    }),
    pgPolicy("services_delete_primary_owner", {
      for: "delete",
      to: authenticatedRole,
      using: sql`${authUid} = ${t.primary_owner}`,
    }),
    pgPolicy("services_admin_all", {
      for: "all",
      to: adminRole,
      using: sql`true`,
      withCheck: sql`true`,
    }),
  ],
);

export const servicesRelations = relations(services, ({ many, one }) => ({
  audits: many(audits),
  owners: many(service_owners),
  versions: many(service_versions),
  primaryOwner: one(users, {
    fields: [services.primary_owner],
    references: [users.id],
    relationName: "primaryOwner",
  }),
}));

export const service_owners = pgTable(
  "service_owners",
  {
    service_id: varchar("service_id", { length: 100 })
      .notNull()
      .references(() => services.id, { onDelete: "cascade" }),
    user_id: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.service_id, t.user_id] }),

    pgPolicy("service_owners_select_public", {
      for: "select",
      to: "public",
      using: sql`true`,
    }),

    pgPolicy("service_owners_insert", {
      for: "insert",
      to: authenticatedRole,
      withCheck: sql`
        EXISTS (
          SELECT 1 FROM services s
          WHERE s.id = ${t.service_id} AND
            (s.primary_owner = ${authUid}
              OR EXISTS (
                SELECT 1 FROM service_owners so
                WHERE so.service_id = ${t.service_id} AND so.user_id = ${authUid}
              )
            )
        )
      `,
    }),

    pgPolicy("service_owners_delete", {
      for: "delete",
      to: authenticatedRole,
      using: sql`
        EXISTS (
          SELECT 1 FROM services s
          WHERE s.id = ${t.service_id} AND
            (s.primary_owner = ${authUid}
              OR EXISTS (
                SELECT 1 FROM service_owners so
                WHERE so.service_id = ${t.service_id} AND so.user_id = ${authUid}
              )
            )
        )
      `,
    }),

    pgPolicy("service_owners_admin_all", {
      for: "all",
      to: adminRole,
      using: sql`true`,
      withCheck: sql`true`,
    }),
  ],
);

export const service_ownersRelations = relations(service_owners, ({ one }) => ({
  service: one(services, {
    fields: [service_owners.service_id],
    references: [services.id],
  }),
  user: one(users, {
    fields: [service_owners.user_id],
    references: [users.id],
  }),
}));

export const service_versions = pgTable(
  "service_versions",
  {
    id: uuid("id")
      .primaryKey()
      .notNull()
      .default(sql`gen_random_uuid()`),
    service_id: varchar("service_id", { length: 100 })
      .notNull()
      .references(() => services.id, { onDelete: "cascade" }),
    version: varchar("version", { length: 30 }).notNull(),
    is_stable: boolean("is_stable").notNull().default(false),
    size: bigint("size", { mode: "bigint" }).notNull(),
    publisher_id: uuid("publisher_id")
      .notNull()
      .references(() => users.id),
    license: text("license").array(),
    yanked: boolean("yanked").notNull().default(false),
    yanked_message: varchar("yanked_message", { length: 200 }),
    yanked_at: timestamp("yanked_at", { withTimezone: true }),
    yanked_by_user_id: uuid("yanked_by_user_id").references(() => users.id),
    downloads: bigint("downloads", { mode: "bigint" })
      .notNull()
      .default(sql`0`),
    readme_url: text("readme_url").notNull(),
    integrity: varchar("integrity", { length: 100 }).notNull(),
    tarball: text("tarball").notNull(),
    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updated_at: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index("service_versions_created_at_idx").on(t.created_at.desc()),
    unique("service_versions_id_service_id_unique").on(t.id, t.service_id),

    pgPolicy("service_versions_select_public", {
      for: "select",
      to: "public",
      using: sql`true`,
    }),

    pgPolicy("service_versions_insert_owner", {
      for: "insert",
      to: authenticatedRole,
      withCheck: sql`
        EXISTS (
          SELECT 1 FROM services s
          WHERE s.id = ${t.service_id} AND
            (s.primary_owner = ${authUid}
              OR EXISTS (
                SELECT 1 FROM service_owners so
                WHERE so.service_id = ${t.service_id} AND so.user_id = ${authUid}
              )
            )
        )
      `,
    }),

    pgPolicy("service_versions_update_owner", {
      for: "update",
      to: authenticatedRole,
      using: sql`
        EXISTS (
          SELECT 1 FROM services s
          WHERE s.id = ${t.service_id} AND
            (s.primary_owner = ${authUid}
              OR EXISTS (
                SELECT 1 FROM service_owners so
                WHERE so.service_id = ${t.service_id} AND so.user_id = ${authUid}
              )
            )
        )
        AND (
          ${t.service_id} IS NOT DISTINCT FROM new.service_id AND
          ${t.version} IS NOT DISTINCT FROM new.version AND
          ${t.size} IS NOT DISTINCT FROM new.size AND
          ${t.publisher_id} IS NOT DISTINCT FROM new.publisher_id AND
          ${t.license} IS NOT DISTINCT FROM new.license AND
          ${t.integrity} IS NOT DISTINCT FROM new.integrity AND
          ${t.tarball} IS NOT DISTINCT FROM new.tarball
        )
      `,
      withCheck: sql`
        EXISTS (
          SELECT 1 FROM services s
          WHERE s.id = ${t.service_id} AND
            (s.primary_owner = ${authUid}
              OR EXISTS (
                SELECT 1 FROM service_owners so
                WHERE so.service_id = ${t.service_id} AND so.user_id = ${authUid}
              )
            )
        )
      `,
    }),

    pgPolicy("service_versions_admin_all", {
      for: "all",
      to: adminRole,
      using: sql`true`,
      withCheck: sql`true`,
    }),
  ],
);

export const service_versionsRelations = relations(
  service_versions,
  ({ one, many }) => ({
    service: one(services, {
      fields: [service_versions.service_id],
      references: [services.id],
    }),
    publisher: one(users, {
      fields: [service_versions.publisher_id],
      references: [users.id],
      relationName: "published_by",
    }),
    contributors: many(service_version_contributors),
  }),
);

export const service_version_contributors = pgTable(
  "service_version_contributors",
  {
    service_id: varchar("service_id", { length: 100 }).notNull(),
    service_version_id: uuid("service_version_id")
      .notNull()
      .references(() => service_versions.id, { onDelete: "cascade" }),

    user_id: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.service_id, t.service_version_id, t.user_id] }),

    pgPolicy("service_version_contributors_select_public", {
      for: "select",
      to: "public",
      using: sql`true`,
    }),

    pgPolicy("svc_version_contrib_insert", {
      for: "insert",
      to: authenticatedRole,
      withCheck: sql`
        EXISTS (
          SELECT 1 FROM services s
          WHERE s.id = ${t.service_id} AND
            (s.primary_owner = ${authUid}
              OR EXISTS (
                SELECT 1 FROM service_owners so
                WHERE so.service_id = ${t.service_id} AND so.user_id = ${authUid}
              )
            )
        )
      `,
    }),

    pgPolicy("svc_version_contrib_delete", {
      for: "delete",
      to: authenticatedRole,
      using: sql`
        EXISTS (
          SELECT 1 FROM services s
          WHERE s.id = ${t.service_id} AND
            (s.primary_owner = ${authUid}
              OR EXISTS (
                SELECT 1 FROM service_owners so
                WHERE so.service_id = ${t.service_id} AND so.user_id = ${authUid}
              )
            )
        )
      `,
    }),
  ],
);

export const service_version_contributorsRelations = relations(
  service_version_contributors,
  ({ one }) => ({
    user: one(users, {
      fields: [service_version_contributors.user_id],
      references: [users.id],
    }),
    version: one(service_versions, {
      fields: [service_version_contributors.service_version_id],
      references: [service_versions.id],
    }),
  }),
);

export const audits = pgTable(
  "audits",
  {
    id: serial("id").primaryKey(),
    action: auditActionEnum("action").notNull(),
    user_id: uuid("user_id")
      .notNull()
      .references(() => users.id),
    service_id: varchar("service_id", { length: 100 })
      .notNull()
      .references(() => services.id, { onDelete: "cascade" }),
    service_version_id: uuid("service_version_id").references(
      () => service_versions.id,
    ),
    timestamp: timestamp("timestamp", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("audits_timestamp_idx").on(t.timestamp.desc()),

    pgPolicy("audits_select_public", {
      for: "select",
      to: "public",
      using: sql`true`,
    }),

    pgPolicy("audits_admin_all", {
      for: "all",
      to: adminRole,
      using: sql`true`,
      withCheck: sql`true`,
    }),
  ],
);

export const auditsRelations = relations(audits, ({ one }) => ({
  user: one(users, {
    fields: [audits.user_id],
    references: [users.id],
  }),
  service: one(services, {
    fields: [audits.service_id],
    references: [services.id],
  }),
  version: one(service_versions, {
    fields: [audits.service_version_id],
    references: [service_versions.id],
  }),
}));
