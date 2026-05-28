-- NairaInvoice initial schema (self-hosted, no Supabase)

CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN');
CREATE TYPE "InvoiceType" AS ENUM ('invoice', 'receipt');
CREATE TYPE "InvoiceStatus" AS ENUM ('draft', 'sent', 'paid', 'overdue', 'cancelled');
CREATE TYPE "DiscountType" AS ENUM ('percentage', 'fixed');

CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "email_verified" BOOLEAN NOT NULL DEFAULT false,
    "email_verify_token" TEXT,
    "password_reset_token" TEXT,
    "password_reset_expires" TIMESTAMP(3),
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE INDEX "users_email_idx" ON "users"("email");

CREATE TABLE "refresh_tokens" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMP(3),
    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "refresh_tokens_token_hash_key" ON "refresh_tokens"("token_hash");
CREATE INDEX "refresh_tokens_user_id_idx" ON "refresh_tokens"("user_id");

CREATE TABLE "business_profiles" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "business_name" TEXT NOT NULL,
    "business_address" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "logo_url" TEXT,
    "bank_name" TEXT,
    "account_number" TEXT,
    "account_name" TEXT,
    "tax_id" TEXT,
    "invoice_prefix" TEXT NOT NULL DEFAULT 'INV',
    "next_invoice_number" INTEGER NOT NULL DEFAULT 1,
    "brand_accent_color" TEXT DEFAULT '#6D28D9',
    "invoice_footer_text" TEXT DEFAULT 'Generated with Naira Invoice',
    "invoice_signature" TEXT,
    "invoice_watermark_text" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "business_profiles_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "business_profiles_user_id_key" ON "business_profiles"("user_id");

CREATE TABLE "clients" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "client_name" TEXT NOT NULL,
    "client_email" TEXT,
    "client_phone" TEXT,
    "client_address" TEXT,
    "notes" TEXT,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "clients_user_id_idx" ON "clients"("user_id");
CREATE INDEX "clients_user_id_client_name_idx" ON "clients"("user_id", "client_name");

CREATE TABLE "invoices" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "client_id" UUID,
    "invoice_number" TEXT NOT NULL,
    "invoice_type" "InvoiceType" NOT NULL,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'draft',
    "invoice_date" DATE NOT NULL,
    "due_date" DATE,
    "subtotal" DECIMAL(12,2) NOT NULL,
    "tax_percentage" DECIMAL(5,2),
    "tax_amount" DECIMAL(12,2),
    "discount_type" "DiscountType",
    "discount_value" DECIMAL(12,2),
    "discount_amount" DECIMAL(12,2),
    "total_amount" DECIMAL(12,2) NOT NULL,
    "notes" TEXT,
    "payment_method" TEXT,
    "payment_date" DATE,
    "invoice_template" TEXT DEFAULT 'modern_fintech',
    "currency" TEXT DEFAULT 'NGN',
    "temp_client_name" TEXT,
    "temp_client_email" TEXT,
    "temp_client_phone" TEXT,
    "temp_client_address" TEXT,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "invoices_user_id_invoice_number_key" ON "invoices"("user_id", "invoice_number");
CREATE INDEX "invoices_user_id_idx" ON "invoices"("user_id");
CREATE INDEX "invoices_client_id_idx" ON "invoices"("client_id");
CREATE INDEX "invoices_status_idx" ON "invoices"("status");
CREATE INDEX "invoices_user_id_created_at_idx" ON "invoices"("user_id", "created_at" DESC);

CREATE TABLE "invoice_items" (
    "id" UUID NOT NULL,
    "invoice_id" UUID NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" DECIMAL(10,2) NOT NULL,
    "unit_price" DECIMAL(12,2) NOT NULL,
    "line_total" DECIMAL(12,2) NOT NULL,
    "sort_order" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "invoice_items_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "invoice_items_invoice_id_idx" ON "invoice_items"("invoice_id");

CREATE TABLE "invoice_public_links" (
    "id" UUID NOT NULL,
    "invoice_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "public_token" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "invoice_public_links_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "invoice_public_links_public_token_key" ON "invoice_public_links"("public_token");
CREATE INDEX "invoice_public_links_public_token_idx" ON "invoice_public_links"("public_token");
CREATE INDEX "invoice_public_links_invoice_id_idx" ON "invoice_public_links"("invoice_id");

CREATE TABLE "invoice_events" (
    "id" UUID NOT NULL,
    "invoice_id" UUID NOT NULL,
    "event_type" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip_hash" TEXT,
    CONSTRAINT "invoice_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "invoice_events_invoice_id_idx" ON "invoice_events"("invoice_id");
CREATE INDEX "invoice_events_invoice_id_timestamp_idx" ON "invoice_events"("invoice_id", "timestamp" DESC);

CREATE TABLE "onboarding_progress" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "profile_completed" BOOLEAN NOT NULL DEFAULT false,
    "client_added" BOOLEAN NOT NULL DEFAULT false,
    "invoice_created" BOOLEAN NOT NULL DEFAULT false,
    "wizard_dismissed" BOOLEAN NOT NULL DEFAULT false,
    "checklist_closed" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "onboarding_progress_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "onboarding_progress_user_id_key" ON "onboarding_progress"("user_id");

ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "business_profiles" ADD CONSTRAINT "business_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "clients" ADD CONSTRAINT "clients_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "invoice_public_links" ADD CONSTRAINT "invoice_public_links_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "invoice_public_links" ADD CONSTRAINT "invoice_public_links_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "invoice_events" ADD CONSTRAINT "invoice_events_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "onboarding_progress" ADD CONSTRAINT "onboarding_progress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
