import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  uniqueIndex,
  index,
  serial,
} from "drizzle-orm/pg-core";

// ----- better-auth tables -----

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("emailVerified").notNull().default(false),
  image: text("image"),
  role: text("role").notNull().default("user"), // "user" | "admin"
  banned: boolean("banned").notNull().default(false),
  banReason: text("banReason"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expiresAt").notNull(),
  ipAddress: text("ipAddress"),
  userAgent: text("userAgent"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accountId: text("accountId").notNull(),
  providerId: text("providerId").notNull(),
  accessToken: text("accessToken"),
  refreshToken: text("refreshToken"),
  accessTokenExpiresAt: timestamp("accessTokenExpiresAt"),
  refreshTokenExpiresAt: timestamp("refreshTokenExpiresAt"),
  scope: text("scope"),
  idToken: text("idToken"),
  password: text("password"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

// ----- app tables -----

export const link = pgTable(
  "link",
  {
    id: text("id").primaryKey(), // slug; nanoid(6) or custom
    url: text("url").notNull(),
    userId: text("userId").references(() => user.id, { onDelete: "set null" }),
    custom: boolean("custom").notNull().default(false),
    disabled: boolean("disabled").notNull().default(false),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
    expiresAt: timestamp("expiresAt"),
  },
  (t) => ({
    userIdx: index("link_user_idx").on(t.userId),
  }),
);

export const linkEvent = pgTable(
  "link_event",
  {
    id: serial("id").primaryKey(),
    linkId: text("linkId")
      .notNull()
      .references(() => link.id, { onDelete: "cascade" }),
    at: timestamp("at").notNull().defaultNow(),
    country: text("country"),       // from cf-ipcountry or x-vercel-ip-country
    referer: text("referer"),
    userAgent: text("userAgent"),
    ipHash: text("ipHash"),         // sha256(ip + DAILY_SALT) — for dedupe, never raw IP
  },
  (t) => ({
    linkIdx: index("link_event_link_idx").on(t.linkId),
    atIdx: index("link_event_at_idx").on(t.at),
  }),
);

export const blacklist = pgTable(
  "blacklist",
  {
    id: serial("id").primaryKey(),
    pattern: text("pattern").notNull().unique(), // "example.com" or "*.example.com"
    reason: text("reason"),
    addedBy: text("addedBy").references(() => user.id, { onDelete: "set null" }),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
  },
  (t) => ({
    patternIdx: uniqueIndex("blacklist_pattern_idx").on(t.pattern),
  }),
);
