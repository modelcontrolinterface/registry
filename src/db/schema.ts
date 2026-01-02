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

export const adminRole = pgRole("package_admin");

export const packageCategoryEnum = pgEnum("package_category", [
  "hook",
  "server",
  "sandbox",
  "interceptor",
]);

export const auditActionEnum = pgEnum("audit_action", [
  "update_package",
  "update_package_owners",
  "create_package_version",
  "update_package_version",
]);

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    avatar_url: text("avatar_url").notNull(),
    email: varchar("email", { length: 150 }).notNull().unique(),
    display_name: varchar("display_name", { length: 100 }).notNull(),
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
      withCheck: sql`
        ${authUid} = ${t.id}
        AND ${t.created_at} = (SELECT created_at FROM users WHERE id = ${t.id})
      `,
    }),
    pgPolicy("users_delete_own", {
      for: "delete",
      to: authenticatedRole,
      using: sql`${authUid} = ${t.id}`,
    }),
  ],
);

export const packages = pgTable(
  "packages",
  {
    id: varchar("id", { length: 100 }).primaryKey(),
    name: varchar("name", { length: 100 }).notNull().unique(),
    description: varchar("description", { length: 500 }).notNull(),
    categories: packageCategoryEnum("categories").array().notNull(),
    keywords: text("keywords")
      .array()
      .notNull()
      .default(sql`ARRAY[]::text[]`),
    homepage: text("homepage"),
    repository: text("repository"),
    default_version: varchar("default_version", { length: 100 }),
    primary_owner_id: uuid("primary_owner")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
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
    index("packages_is_verified_idx").on(t.is_verified),
    index("packages_is_deprecated_idx").on(t.is_deprecated),
    index("packages_updated_at_idx").on(t.updated_at.desc()),
    index("packages_keywords_gin_idx").using("gin", t.keywords),
    index("packages_primary_owner_id_idx").on(t.primary_owner_id),
    index("packages_categories_gin_idx").using("gin", t.categories),

    check(
      "packages_id_format",
      sql`${t.id} ~ '^[a-z](?:[a-z0-9_-]{0,62}[a-z0-9])?$'`,
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
      "packages_categories_max_length",
      sql`array_length(${t.categories}, 1) <= 4`,
    ),
    check(
      "packages_deprecation_consistency",
      sql`
        (${t.is_deprecated} IS FALSE AND ${t.deprecation_message} IS NULL)
        OR
        (${t.is_deprecated} IS TRUE AND ${t.deprecation_message} IS NOT NULL)
      `,
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
      withCheck: sql`
        ${authUid} IS NOT NULL
        AND ${authUid} = ${t.primary_owner_id}
      `,
    }),
    pgPolicy("packages_update_owners", {
      for: "update",
      to: authenticatedRole,
      using: sql`
        ${authUid} = ${t.primary_owner_id}
        OR EXISTS (
          SELECT 1 FROM package_owners po
          WHERE po.package_id = ${t.id} AND po.user_id = ${authUid}
        )
      `,
      withCheck: sql`
        (
           ${authUid} = ${t.primary_owner_id} 
           OR EXISTS (
             SELECT 1 FROM package_owners po
             WHERE po.package_id = ${t.id} AND po.user_id = ${authUid}
           )
        )
        AND (
          ${t.primary_owner_id} = (SELECT primary_owner FROM packages WHERE id = ${t.id})
          OR
          (SELECT primary_owner FROM packages WHERE id = ${t.id}) = ${authUid}
        )
        AND ${t.id} = (SELECT id FROM packages WHERE id = ${t.id})
        AND ${t.created_at} = (SELECT created_at FROM packages WHERE id = ${t.id})
        AND ${t.is_verified} = (SELECT is_verified FROM packages WHERE id = ${t.id})
      `,
    }),
    pgPolicy("packages_delete_primary_owner", {
      for: "delete",
      to: authenticatedRole,
      using: sql`${authUid} = ${t.primary_owner_id}`,
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
    authors: text("authors")
      .array()
      .notNull()
      .default(sql`ARRAY[]::text[]`),
    license: varchar("license", { length: 100 }),
    license_file: text("license_file"),
    is_yanked: boolean("is_yanked").notNull().default(false),
    yank_message: varchar("yank_message", { length: 200 }),
    readme_url: text("readme_url"),
    changelog_url: text("changelog_url"),
    tarball: text("tarball").notNull(),
    size: bigint("size", { mode: "number" }).notNull(),
    digest: varchar("digest", { length: 100 }).notNull(),
    abi_version: varchar("abi_version", { length: 50 }).notNull(),
    downloads: bigint("downloads", { mode: "number" }).notNull().default(0),
    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updated_at: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("package_versions_version_idx").on(t.version),
    index("package_versions_yanked_idx").on(t.is_yanked),
    index("package_versions_package_id_idx").on(t.package_id),
    index("package_versions_publisher_id_idx").on(t.publisher_id),
    index("package_versions_created_at_idx").on(t.created_at.desc()),

    unique("package_versions_package_version_unique").on(
      t.package_id,
      t.version,
    ),

    check(
      "package_versions_version_format",
      sql`${t.version} ~ '^(0|[1-9]\\d*)\\.(0|[1-9]\\d*)\\.(0|[1-9]\\d*)(?:-((?:0|[1-9]\\d*|\\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\\.(?:0|[1-9]\\d*|\\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\\+([0-9a-zA-Z-]+(?:\\.[0-9a-zA-Z-]+)*))?$'`,
    ),
    check(
      "package_versions_abi_version_format",
      sql`${t.abi_version} ~ '^(0|[1-9]\\d*)\\.(0|[1-9]\\d*)\\.(0|[1-9]\\d*)(?:-((?:0|[1-9]\\d*|\\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\\.(?:0|[1-9]\\d*|\\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\\+([0-9a-zA-Z-]+(?:\\.[0-9a-zA-Z-]+)*))?$'`,
    ),
    check(
      "package_versions_license_specified",
      sql`${t.license} IS NOT NULL OR ${t.license_file} IS NOT NULL`,
    ),
    check(
      "package_versions_yanked_consistency",
      sql`
        (${t.is_yanked} IS FALSE AND ${t.yank_message} IS NULL)
        OR
        (${t.is_yanked} IS TRUE AND ${t.yank_message} IS NOT NULL)
      `,
    ),
    check(
      "package_versions_authors_format",
      sql`array_to_string(${t.authors}, '') ~ '^([^<(]+?)(?:\\s*<([^>]+)>)?(?:\\s*\\(([^)]+)\\))?$'`,
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
        ${authUid} = ${t.publisher_id} 
        AND EXISTS (SELECT 1 FROM packages p WHERE p.id = ${t.package_id} AND (
          p.primary_owner = ${authUid} OR EXISTS (
            SELECT 1 FROM package_owners po
            WHERE po.package_id = ${t.package_id} AND po.user_id = ${authUid}
          )
        ))
      `,
    }),
    pgPolicy("package_versions_update_owner", {
      for: "update",
      to: authenticatedRole,
      using: sql`
        EXISTS (SELECT 1 FROM packages p WHERE p.id = ${t.package_id}
          AND (p.primary_owner = ${authUid} OR EXISTS (
            SELECT 1 FROM package_owners po
            WHERE po.package_id = ${t.package_id} AND po.user_id = ${authUid}
          ))
        )
      `,
      withCheck: sql`
        EXISTS (SELECT 1 FROM packages p WHERE p.id = ${t.package_id}
          AND (p.primary_owner = ${authUid} OR EXISTS (
              SELECT 1 FROM package_owners po
              WHERE po.package_id = ${t.package_id} AND po.user_id = ${authUid}
          ))
        )
        AND ${t.id} = (SELECT id FROM package_versions WHERE id = ${t.id})
        AND ${t.size} = (SELECT size FROM package_versions WHERE id = ${t.id})
        AND ${t.digest} = (SELECT digest FROM package_versions WHERE id = ${t.id})
        AND ${t.version} = (SELECT version FROM package_versions WHERE id = ${t.id})
        AND ${t.license} = (SELECT license FROM package_versions WHERE id = ${t.id})
        AND ${t.tarball} = (SELECT tarball FROM package_versions WHERE id = ${t.id})
        AND ${t.downloads} = (SELECT downloads FROM package_versions WHERE id = ${t.id})
        AND ${t.created_at} = (SELECT created_at FROM package_versions WHERE id = ${t.id})
        AND ${t.package_id} = (SELECT package_id FROM package_versions WHERE id = ${t.id})
        AND ${t.abi_version} = (SELECT abi_version FROM package_versions WHERE id = ${t.id})
        AND ${t.publisher_id} = (SELECT publisher_id FROM package_versions WHERE id = ${t.id})
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
    pgPolicy("package_owners_insert_primary_owner", {
      for: "insert",
      to: authenticatedRole,
      withCheck: sql`
        EXISTS (SELECT 1 FROM packages p WHERE p.id = ${t.package_id}
          AND p.primary_owner = ${authUid}
        )
      `,
    }),
    pgPolicy("package_owners_delete_authorized", {
      for: "delete",
      to: authenticatedRole,
      using: sql`
        EXISTS (SELECT 1 FROM packages p WHERE p.id = ${t.package_id}
          AND p.primary_owner = ${authUid}
        )
        OR ${t.user_id} = ${authUid}
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
    field_name: varchar("field_name", { length: 100 }),
    previous_value: jsonb("previous_value"),
    current_value: jsonb("current_value"),
    timestamp: timestamp("timestamp", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("audits_action_idx").on(t.action),
    index("audits_user_id_idx").on(t.user_id),
    index("audits_package_id_idx").on(t.package_id),
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

export const automation_tokens = pgTable(
  "automation_tokens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    user_id: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 100 }).notNull(),
    token_hash: varchar("token_hash", { length: 255 }).notNull(),
    revoked: boolean("revoked").notNull().default(false),
    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    revoked_at: timestamp("revoked_at", { withTimezone: true }),
  },
  (t) => [
    index("automation_tokens_user_id_idx").on(t.user_id),
    index("automation_tokens_revoked_idx").on(t.revoked),
    unique("automation_tokens_user_id_name_unique").on(t.user_id, t.name),

    pgPolicy("automation_tokens_select_own", {
      for: "select",
      to: authenticatedRole,
      using: sql`${t.user_id} = ${authUid}`,
    }),
    pgPolicy("automation_tokens_insert_own", {
      for: "insert",
      to: authenticatedRole,
      withCheck: sql`${t.user_id} = ${authUid}`,
    }),
    pgPolicy("automation_tokens_delete_own", {
      for: "delete",
      to: authenticatedRole,
      using: sql`${t.user_id} = ${authUid}`,
    }),
    pgPolicy("automation_tokens_admin_all", {
      for: "all",
      to: adminRole,
      using: sql`true`,
      withCheck: sql`true`,
    }),
  ],
);

export const automation_tokensRelations = relations(
  automation_tokens,
  ({ one }) => ({
    user: one(users, {
      fields: [automation_tokens.user_id],
      references: [users.id],
    }),
  })
);

export const usersRelations = relations(users, ({ many }) => ({
  audits: many(audits),
  owned_packages: many(packages),
  co_owned_packages: many(package_owners),
  published_versions: many(package_versions, { relationName: "publisher" }),
}));

export const packagesRelations = relations(packages, ({ many, one }) => ({
  audits: many(audits),
  owners: many(package_owners),
  versions: many(package_versions),
  primary_owner: one(users, {
    fields: [packages.primary_owner_id],
    references: [users.id],
    relationName: "primary_owner",
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
