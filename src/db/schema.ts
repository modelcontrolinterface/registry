import {
  text,
  uuid,
  jsonb,
  index,
  check,
  pgRole,
  bigint,
  pgEnum,
  unique,
  varchar,
  pgTable,
  boolean,
  pgPolicy,
  timestamp,
  primaryKey,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import { authenticatedRole, authUid } from "drizzle-orm/supabase";

export const packageCategoryEnum = pgEnum("package_category", [
  "server",
  "sandbox",
  "interceptor",
]);

export const auditActionEnum = pgEnum("audit_action", [
  "package_verify",
  "package_unverify",
  "package_deprecate",
  "package_undeprecate",
  "package_transfer_ownership",
  "version_yank",
  "version_unyank",
  "version_update",
  "version_publish",
]);

export const adminRole = pgRole("package_admin");

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey(),
    email: varchar("email", { length: 150 }).notNull().unique(),
    display_name: varchar("display_name", { length: 100 }).notNull(),
    avatar_url: text("avatar_url"),
    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updated_at: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("users_email_idx").on(t.email),

    pgPolicy("users_select_public", {
      for: "select",
      to: "public",
      using: sql`true`,
    }),
    pgPolicy("users_update_own", {
      for: "update",
      to: authenticatedRole,
      using: sql`${authUid} = ${t.id}`,
      withCheck: sql`${authUid} = ${t.id}`,
    }),
  ],
);

export const packages = pgTable(
  "packages",
  {
    id: varchar("id", { length: 100 }).primaryKey(),
    name: varchar("name", { length: 100 }).notNull().unique(),
    categories: packageCategoryEnum("categories").array().notNull(),
    primary_owner: uuid("primary_owner")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    default_version: varchar("default_version", { length: 100 }),
    keywords: text("keywords")
      .array()
      .notNull()
      .default(sql`ARRAY[]::text[]`),
    homepage: text("homepage"),
    repository: text("repository"),
    description: varchar("description", { length: 500 }),
    is_verified: boolean("is_verified").notNull().default(false),
    is_deprecated: boolean("is_deprecated").notNull().default(false),
    deprecation_message: varchar("deprecation_message", { length: 500 }),
    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updated_at: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("packages_name_idx").on(t.name),
    index("packages_primary_owner_idx").on(t.primary_owner),
    index("packages_updated_at_idx").on(t.updated_at.desc()),
    index("packages_categories_gin_idx").using("gin", t.categories),
    index("packages_keywords_gin_idx").using("gin", t.keywords),
    index("packages_is_verified_idx").on(t.is_verified),

    check(
      "packages_id_format",
      sql`${t.id} ~ '^[a-z](?:[a-z0-9_-]{0,62}[a-z0-9])?$'`,
    ),
    check(
      "packages_name_format",
      sql`${t.name} ~ '^[a-z](?:[a-z0-9_-]{0,62}[a-z0-9])?$'`,
    ),
    check(
      "packages_keywords_format",
      sql`array_to_string(${t.keywords}, '') ~ '^[a-z0-9 _-]*$'`,
    ),
    check(
      "packages_keywords_max_length",
      sql`array_length(${t.keywords}, 1) <= 5`,
    ),
    check(
      "packages_deprecation_consistency",
      sql`(NOT ${t.is_deprecated}) OR (${t.deprecation_message} IS NOT NULL)`,
    ),
    check(
      "packages_default_version_format",
      sql`${t.default_version} IS NULL OR ${t.default_version} ~ '^(0|[1-9]\\d*)\\.(0|[1-9]\\d*)\\.(0|[1-9]\\d*)(?:-((?:0|[1-9]\\d*|\\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\\.(?:0|[1-9]\\d*|\\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\\+([0-9a-zA-Z-]+(?:\\.[0-9a-zA-Z-]+)*))?$'`,
    ),

    pgPolicy("packages_select_public", {
      for: "select",
      to: "public",
      using: sql`true`,
    }),
    pgPolicy("packages_insert_authenticated", {
      for: "insert",
      to: authenticatedRole,
      withCheck: sql`${authUid} IS NOT NULL AND ${authUid} = ${t.primary_owner}`,
    }),
    pgPolicy("packages_update_owners", {
      for: "update",
      to: authenticatedRole,
      using: sql`
        ${authUid} = ${t.primary_owner} OR
        EXISTS (
          SELECT 1 FROM package_owners po
          WHERE po.package_id = ${t.id} AND po.user_id = ${authUid}
        )
      `,
      withCheck: sql`
        (${authUid} = ${t.primary_owner} OR
        EXISTS (
          SELECT 1 FROM package_owners po
          WHERE po.package_id = ${t.id} AND po.user_id = ${authUid}
        )) AND
        (${t.primary_owner} = (SELECT primary_owner FROM packages WHERE id = ${t.id})) AND
        (${t.is_verified} = (SELECT is_verified FROM packages WHERE id = ${t.id}))
      `,
    }),
    pgPolicy("packages_delete_primary_owner", {
      for: "delete",
      to: authenticatedRole,
      using: sql`${authUid} = ${t.primary_owner}`,
    }),
    pgPolicy("packages_admin_all", {
      for: "all",
      to: adminRole,
      using: sql`true`,
      withCheck: sql`true`,
    }),
  ],
);

export const package_versions = pgTable(
  "package_versions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    package_id: varchar("package_id", { length: 100 })
      .notNull()
      .references(() => packages.id, { onDelete: "cascade" }),
    version: varchar("version", { length: 100 }).notNull(),
    publisher_id: uuid("publisher_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    authors: jsonb("authors")
      .$type<string[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    license: varchar("license", { length: 100 }),
    license_file: text("license_file"),
    yanked: boolean("yanked").notNull().default(false),
    yanked_at: timestamp("yanked_at", { withTimezone: true }),
    yanked_message: varchar("yanked_message", { length: 200 }),
    yanked_by_user_id: uuid("yanked_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    readme: text("readme").notNull(),
    changelog: text("changelog"),
    tarball: text("tarball").notNull(),
    abi_version: varchar("abi_version", { length: 50 }).notNull(),
    digest: varchar("digest", { length: 100 }).notNull(),
    size: bigint("size", { mode: "number" }).notNull(),
    downloads: bigint("downloads", { mode: "number" }).notNull().default(0),
    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updated_at: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("package_versions_package_id_idx").on(t.package_id),
    index("package_versions_created_at_idx").on(t.created_at.desc()),
    index("package_versions_version_idx").on(t.version),
    index("package_versions_yanked_idx").on(t.yanked),
    index("package_versions_publisher_id_idx").on(t.publisher_id),

    unique("package_versions_package_version_unique").on(
      t.package_id,
      t.version,
    ),
    check(
      "package_versions_version_format",
      sql`${t.version} ~ '^(0|[1-9]\\d*)\\.(0|[1-9]\\d*)\\.(0|[1-9]\\d*)(?:-((?:0|[1-9]\\d*|\\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\\.(?:0|[1-9]\\d*|\\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\\+([0-9a-zA-Z-]+(?:\\.[0-9a-zA-Z-]+)*))?$'`,
    ),
    check(
      "package_versions_yanked_consistency",
      sql`
        (${t.yanked} IS FALSE AND ${t.yanked_at} IS NULL AND ${t.yanked_by_user_id} IS NULL) OR 
        (${t.yanked} IS TRUE AND ${t.yanked_at} IS NOT NULL AND ${t.yanked_by_user_id} IS NOT NULL)
      `,
    ),
    check(
      "package_versions_license_specified",
      sql`${t.license} IS NOT NULL OR ${t.license_file} IS NOT NULL`,
    ),
    check(
      "package_versions_authors_format",
      sql`jsonb_typeof(${t.authors}) = 'array'`,
    ),
    check("package_versions_size_positive", sql`${t.size} > 0`),
    check("package_versions_downloads_non_negative", sql`${t.downloads} >= 0`),

    pgPolicy("package_versions_select_public", {
      for: "select",
      to: "public",
      using: sql`true`,
    }),
    pgPolicy("package_versions_insert_owner", {
      for: "insert",
      to: authenticatedRole,
      withCheck: sql`
        EXISTS (
          SELECT 1 FROM packages p
          WHERE p.id = ${t.package_id} AND
            (p.primary_owner = ${authUid} OR
              EXISTS (
                SELECT 1 FROM package_owners po
                WHERE po.package_id = ${t.package_id} AND po.user_id = ${authUid}
              )
            )
        )
      `,
    }),
    pgPolicy("package_versions_update_owner", {
      for: "update",
      to: authenticatedRole,
      using: sql`
        EXISTS (
          SELECT 1 FROM packages p
          WHERE p.id = ${t.package_id} AND
            (p.primary_owner = ${authUid} OR
              EXISTS (
                SELECT 1 FROM package_owners po
                WHERE po.package_id = ${t.package_id} AND po.user_id = ${authUid}
              )
            )
        )
      `,
      withCheck: sql`
        EXISTS (
          SELECT 1 FROM packages p
          WHERE p.id = ${t.package_id} AND
            (p.primary_owner = ${authUid} OR
              EXISTS (
                SELECT 1 FROM package_owners po
                WHERE po.package_id = ${t.package_id} AND po.user_id = ${authUid}
              )
            )
        ) AND
        ${t.package_id} = (SELECT package_id FROM package_versions WHERE id = ${t.id}) AND
        ${t.version} = (SELECT version FROM package_versions WHERE id = ${t.id}) AND
        ${t.size} = (SELECT size FROM package_versions WHERE id = ${t.id}) AND
        ${t.publisher_id} = (SELECT publisher_id FROM package_versions WHERE id = ${t.id}) AND
        ${t.digest} = (SELECT digest FROM package_versions WHERE id = ${t.id}) AND
        ${t.tarball} = (SELECT tarball FROM package_versions WHERE id = ${t.id})
      `,
    }),
    pgPolicy("package_versions_admin_all", {
      for: "all",
      to: adminRole,
      using: sql`true`,
      withCheck: sql`true`,
    }),
  ],
);

export const package_owners = pgTable(
  "package_owners",
  {
    package_id: varchar("package_id", { length: 100 })
      .notNull()
      .references(() => packages.id, { onDelete: "cascade" }),
    user_id: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.package_id, t.user_id] }),

    index("package_owners_user_id_idx").on(t.user_id),
    index("package_owners_package_id_idx").on(t.package_id),

    pgPolicy("package_owners_select_public", {
      for: "select",
      to: "public",
      using: sql`true`,
    }),
    pgPolicy("package_owners_insert", {
      for: "insert",
      to: authenticatedRole,
      withCheck: sql`
        EXISTS (
          SELECT 1 FROM packages p
          WHERE p.id = ${t.package_id} AND
            (p.primary_owner = ${authUid} OR
              EXISTS (
                SELECT 1 FROM package_owners po
                WHERE po.package_id = ${t.package_id} AND po.user_id = ${authUid}
              )
            )
        )
      `,
    }),
    pgPolicy("package_owners_delete", {
      for: "delete",
      to: authenticatedRole,
      using: sql`
        EXISTS (
          SELECT 1 FROM packages p
          WHERE p.id = ${t.package_id} AND
            (p.primary_owner = ${authUid} OR
              EXISTS (
                SELECT 1 FROM package_owners po
                WHERE po.package_id = ${t.package_id} AND po.user_id = ${authUid}
              )
            )
        )
      `,
    }),
    pgPolicy("package_owners_admin_all", {
      for: "all",
      to: adminRole,
      using: sql`true`,
      withCheck: sql`true`,
    }),
  ],
);

export const audits = pgTable(
  "audits",
  {
    id: bigint("id", { mode: "number" })
      .primaryKey()
      .generatedAlwaysAsIdentity(),
    action: auditActionEnum("action").notNull(),
    user_id: uuid("user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    package_id: varchar("package_id", { length: 100 }).references(
      () => packages.id,
      { onDelete: "set null" },
    ),
    package_version_id: uuid("package_version_id").references(
      () => package_versions.id,
      { onDelete: "set null" },
    ),
    version_number: varchar("version_number", { length: 100 }),
    metadata: jsonb("metadata"),
    timestamp: timestamp("timestamp", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("audits_timestamp_idx").on(t.timestamp.desc()),
    index("audits_user_id_idx").on(t.user_id),
    index("audits_package_id_idx").on(t.package_id),
    index("audits_action_idx").on(t.action),

    pgPolicy("audits_select_public", {
      for: "select",
      to: "public",
      using: sql`true`,
    }),
    pgPolicy("audits_insert_authenticated", {
      for: "insert",
      to: authenticatedRole,
      withCheck: sql`${authUid} = ${t.user_id}`,
    }),
    pgPolicy("audits_admin_all", {
      for: "all",
      to: adminRole,
      using: sql`true`,
      withCheck: sql`true`,
    }),
  ],
);

export const usersRelations = relations(users, ({ many }) => ({
  audits: many(audits),
  owned_packages: many(packages),
  co_owned_packages: many(package_owners),
  published_versions: many(package_versions, { relationName: "publisher" }),
  yanked_versions: many(package_versions, { relationName: "yanker" }),
}));

export const packagesRelations = relations(packages, ({ many, one }) => ({
  audits: many(audits),
  owners: many(package_owners),
  versions: many(package_versions),
  primaryOwner: one(users, {
    fields: [packages.primary_owner],
    references: [users.id],
    relationName: "primaryOwner",
  }),
}));

export const package_ownersRelations = relations(package_owners, ({ one }) => ({
  package: one(packages, {
    fields: [package_owners.package_id],
    references: [packages.id],
  }),
  user: one(users, {
    fields: [package_owners.user_id],
    references: [users.id],
  }),
}));

export const package_versionsRelations = relations(
  package_versions,
  ({ one }) => ({
    package: one(packages, {
      fields: [package_versions.package_id],
      references: [packages.id],
    }),
    publisher: one(users, {
      fields: [package_versions.publisher_id],
      references: [users.id],
      relationName: "publisher",
    }),
    yankedBy: one(users, {
      fields: [package_versions.yanked_by_user_id],
      references: [users.id],
      relationName: "yanker",
    }),
  }),
);

export const auditsRelations = relations(audits, ({ one }) => ({
  user: one(users, {
    fields: [audits.user_id],
    references: [users.id],
  }),
  package: one(packages, {
    fields: [audits.package_id],
    references: [packages.id],
  }),
  version: one(package_versions, {
    fields: [audits.package_version_id],
    references: [package_versions.id],
  }),
}));
