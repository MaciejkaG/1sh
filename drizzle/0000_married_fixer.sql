CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"accountId" text NOT NULL,
	"providerId" text NOT NULL,
	"accessToken" text,
	"refreshToken" text,
	"accessTokenExpiresAt" timestamp,
	"refreshTokenExpiresAt" timestamp,
	"scope" text,
	"idToken" text,
	"password" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "blacklist" (
	"id" serial PRIMARY KEY NOT NULL,
	"pattern" text NOT NULL,
	"reason" text,
	"addedBy" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "blacklist_pattern_unique" UNIQUE("pattern")
);
--> statement-breakpoint
CREATE TABLE "link" (
	"id" text PRIMARY KEY NOT NULL,
	"url" text NOT NULL,
	"userId" text,
	"custom" boolean DEFAULT false NOT NULL,
	"disabled" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"expiresAt" timestamp
);
--> statement-breakpoint
CREATE TABLE "link_event" (
	"id" serial PRIMARY KEY NOT NULL,
	"linkId" text NOT NULL,
	"at" timestamp DEFAULT now() NOT NULL,
	"country" text,
	"referer" text,
	"userAgent" text,
	"ipHash" text
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"token" text NOT NULL,
	"expiresAt" timestamp NOT NULL,
	"ipAddress" text,
	"userAgent" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"emailVerified" boolean DEFAULT false NOT NULL,
	"image" text,
	"role" text DEFAULT 'user' NOT NULL,
	"banned" boolean DEFAULT false NOT NULL,
	"banReason" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expiresAt" timestamp NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blacklist" ADD CONSTRAINT "blacklist_addedBy_user_id_fk" FOREIGN KEY ("addedBy") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "link" ADD CONSTRAINT "link_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "link_event" ADD CONSTRAINT "link_event_linkId_link_id_fk" FOREIGN KEY ("linkId") REFERENCES "public"."link"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "blacklist_pattern_idx" ON "blacklist" USING btree ("pattern");--> statement-breakpoint
CREATE INDEX "link_user_idx" ON "link" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "link_event_link_idx" ON "link_event" USING btree ("linkId");--> statement-breakpoint
CREATE INDEX "link_event_at_idx" ON "link_event" USING btree ("at");