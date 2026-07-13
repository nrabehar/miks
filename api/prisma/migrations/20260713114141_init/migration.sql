-- CreateEnum
CREATE TYPE "auth_provider_category" AS ENUM ('LOCAL', 'OAUTH');

-- CreateEnum
CREATE TYPE "device_type" AS ENUM ('MOBILE', 'TABLET', 'DESKTOP', 'WEB', 'OTHER');

-- CreateEnum
CREATE TYPE "device_status" AS ENUM ('ACTIVE', 'REVOKED');

-- CreateEnum
CREATE TYPE "flow_source_type" AS ENUM ('CONTRIBUTION', 'PROJECT_REVENUE', 'MANUAL_ENTRY', 'OTHER');

-- CreateEnum
CREATE TYPE "flow_destination_type" AS ENUM ('VAULT', 'MEMBER_WITHDRAWABLE_VAULTS');

-- CreateEnum
CREATE TYPE "member_status" AS ENUM ('ACTIVE', 'LEFT');

-- CreateEnum
CREATE TYPE "kyc_status" AS ENUM ('PENDING', 'IN_REVIEW', 'APPROVED', 'REJECTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "kyc_document_status" AS ENUM ('PENDING', 'VALID', 'REJECTED');

-- CreateEnum
CREATE TYPE "project_status" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'ACTIVE', 'CLOSED');

-- CreateEnum
CREATE TYPE "vault_type" AS ENUM ('GROUP', 'WITHDRAWABLE', 'PROJECT');

-- CreateEnum
CREATE TYPE "event_category" AS ENUM ('FINANCIAL', 'VOTE', 'PROJECT', 'MEMBER', 'CONFIGURATION', 'ACCOUNT', 'KYC');

-- CreateEnum
CREATE TYPE "transaction_direction" AS ENUM ('CREDIT', 'DEBIT');

-- CreateEnum
CREATE TYPE "transaction_type" AS ENUM ('CONTRIBUTION', 'INTERNAL_FLOW', 'PROJECT_PAYOUT', 'MANUAL_ENTRY', 'ADJUSTMENT', 'OTHER');

-- CreateEnum
CREATE TYPE "vote_status" AS ENUM ('OPEN', 'APPROVED', 'REJECTED', 'INVALID');

-- CreateEnum
CREATE TYPE "vote_choice" AS ENUM ('FOR', 'AGAINST', 'ABSTAIN');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" VARCHAR(255),
    "phone" VARCHAR(32),
    "display_name" TEXT NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth_providers" (
    "id" TEXT NOT NULL,
    "code" VARCHAR(32) NOT NULL,
    "name" TEXT NOT NULL,
    "category" "auth_provider_category" NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "config" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "auth_providers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_identities" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "provider_code" VARCHAR(32) NOT NULL,
    "identifier" TEXT,
    "secret_hash" TEXT,
    "provider_account_id" TEXT,
    "access_token" TEXT,
    "refresh_token" TEXT,
    "token_expires_at" TIMESTAMP(3),
    "email_verified" BOOLEAN NOT NULL DEFAULT false,
    "last_used_at" TIMESTAMP(3),
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_identities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification_token_purposes" (
    "id" TEXT NOT NULL,
    "code" VARCHAR(32) NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "verification_token_purposes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification_tokens" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "purpose_code" VARCHAR(32) NOT NULL,
    "identity_id" TEXT,
    "sent_to" TEXT,
    "token_hash" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "max_attempts" INTEGER NOT NULL DEFAULT 5,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "consumed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "verification_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "devices" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" "device_type" NOT NULL,
    "platform" TEXT,
    "device_name" TEXT,
    "device_id" TEXT NOT NULL,
    "push_token" TEXT,
    "status" "device_status" NOT NULL DEFAULT 'ACTIVE',
    "first_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_active_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "devices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "device_id" TEXT,
    "refresh_token" TEXT NOT NULL,
    "user_agent" TEXT,
    "ip" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_log" (
    "id" BIGSERIAL NOT NULL,
    "group_id" TEXT,
    "event_type" VARCHAR(64) NOT NULL,
    "actor_id" TEXT,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contributions" (
    "id" TEXT NOT NULL,
    "group_id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "transaction_id" TEXT,
    "payment_method_code" VARCHAR(32),
    "contributed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "contributions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "flow_rules" (
    "id" TEXT NOT NULL,
    "group_id" TEXT NOT NULL,
    "name" TEXT,
    "source_type" "flow_source_type" NOT NULL,
    "source_ref_id" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "flow_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "flow_destinations" (
    "id" TEXT NOT NULL,
    "flow_rule_id" TEXT NOT NULL,
    "destination_type" "flow_destination_type" NOT NULL,
    "vault_id" TEXT,
    "percentage" DECIMAL(5,2) NOT NULL,

    CONSTRAINT "flow_destinations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "groups" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "creator_id" TEXT NOT NULL,
    "currency_code" VARCHAR(8) NOT NULL DEFAULT 'MGA',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "group_members" (
    "id" TEXT NOT NULL,
    "group_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "status" "member_status" NOT NULL DEFAULT 'ACTIVE',
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "left_at" TIMESTAMP(3),
    "metadata" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "group_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kyc_verifications" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "level_code" VARCHAR(32) NOT NULL,
    "provider_code" VARCHAR(32) NOT NULL,
    "status" "kyc_status" NOT NULL DEFAULT 'PENDING',
    "external_reference" TEXT,
    "rejection_reason" TEXT,
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "metadata" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "kyc_verifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kyc_documents" (
    "id" TEXT NOT NULL,
    "kyc_verification_id" TEXT NOT NULL,
    "document_type_code" VARCHAR(32) NOT NULL,
    "file_url" TEXT NOT NULL,
    "status" "kyc_document_status" NOT NULL DEFAULT 'PENDING',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "kyc_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "group_id" TEXT,
    "event_type_code" VARCHAR(64) NOT NULL,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_preferences" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "event_type_code" VARCHAR(64) NOT NULL,
    "channel_id" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects" (
    "id" TEXT NOT NULL,
    "group_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "proposed_by" TEXT NOT NULL,
    "requested_budget" DECIMAL(18,2) NOT NULL,
    "source_vault_id" TEXT,
    "status" "project_status" NOT NULL DEFAULT 'PENDING',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vaults" (
    "id" TEXT NOT NULL,
    "group_id" TEXT NOT NULL,
    "type" "vault_type" NOT NULL,
    "name" TEXT NOT NULL,
    "member_id" TEXT,
    "project_id" TEXT,
    "cached_balance" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vaults_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "currencies" (
    "id" TEXT NOT NULL,
    "code" VARCHAR(3) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "symbol" VARCHAR(8),
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "currencies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_methods" (
    "id" TEXT NOT NULL,
    "code" VARCHAR(32) NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "config" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_methods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_channels" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "notification_channels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_types" (
    "id" TEXT NOT NULL,
    "code" VARCHAR(64) NOT NULL,
    "category" "event_category" NOT NULL,
    "description" TEXT,

    CONSTRAINT "event_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kyc_levels" (
    "id" TEXT NOT NULL,
    "code" VARCHAR(32) NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "kyc_levels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kyc_providers" (
    "id" TEXT NOT NULL,
    "code" VARCHAR(32) NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "config" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "kyc_providers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kyc_document_types" (
    "id" TEXT NOT NULL,
    "code" VARCHAR(32) NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "kyc_document_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "member_share_cache" (
    "group_id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "percentage" DECIMAL(7,4) NOT NULL,
    "total_contributed" DECIMAL(18,2) NOT NULL,
    "computed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "member_share_cache_pkey" PRIMARY KEY ("group_id","member_id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" TEXT NOT NULL,
    "group_id" TEXT NOT NULL,
    "vault_id" TEXT NOT NULL,
    "direction" "transaction_direction" NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "type" "transaction_type" NOT NULL,
    "source_type" TEXT,
    "source_ref_id" TEXT,
    "payment_method_code" VARCHAR(32),
    "external_reference" TEXT,
    "reversed_transaction_id" TEXT,
    "description" TEXT,
    "created_by" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "votes" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "approval_threshold" DECIMAL(5,2) NOT NULL,
    "min_quorum" INTEGER NOT NULL,
    "duration_hours" INTEGER NOT NULL,
    "opened_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "scheduled_close_at" TIMESTAMP(3) NOT NULL,
    "actual_close_at" TIMESTAMP(3),
    "status" "vote_status" NOT NULL DEFAULT 'OPEN',
    "metadata" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "votes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vote_responses" (
    "id" TEXT NOT NULL,
    "vote_id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "choice" "vote_choice" NOT NULL,
    "voted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vote_responses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "auth_providers_code_key" ON "auth_providers"("code");

-- CreateIndex
CREATE INDEX "user_identities_user_id_idx" ON "user_identities"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_identities_provider_code_provider_account_id_key" ON "user_identities"("provider_code", "provider_account_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_identities_provider_code_identifier_key" ON "user_identities"("provider_code", "identifier");

-- CreateIndex
CREATE UNIQUE INDEX "verification_token_purposes_code_key" ON "verification_token_purposes"("code");

-- CreateIndex
CREATE INDEX "verification_tokens_user_id_purpose_code_idx" ON "verification_tokens"("user_id", "purpose_code");

-- CreateIndex
CREATE INDEX "verification_tokens_token_hash_idx" ON "verification_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "devices_user_id_idx" ON "devices"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "devices_user_id_device_id_key" ON "devices"("user_id", "device_id");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_refresh_token_key" ON "sessions"("refresh_token");

-- CreateIndex
CREATE INDEX "sessions_user_id_idx" ON "sessions"("user_id");

-- CreateIndex
CREATE INDEX "sessions_device_id_idx" ON "sessions"("device_id");

-- CreateIndex
CREATE INDEX "audit_log_group_id_created_at_idx" ON "audit_log"("group_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_log_event_type_idx" ON "audit_log"("event_type");

-- CreateIndex
CREATE UNIQUE INDEX "contributions_transaction_id_key" ON "contributions"("transaction_id");

-- CreateIndex
CREATE INDEX "contributions_member_id_contributed_at_idx" ON "contributions"("member_id", "contributed_at");

-- CreateIndex
CREATE UNIQUE INDEX "group_members_group_id_user_id_key" ON "group_members"("group_id", "user_id");

-- CreateIndex
CREATE INDEX "kyc_verifications_user_id_status_idx" ON "kyc_verifications"("user_id", "status");

-- CreateIndex
CREATE INDEX "notifications_user_id_read_at_idx" ON "notifications"("user_id", "read_at");

-- CreateIndex
CREATE INDEX "notifications_group_id_created_at_idx" ON "notifications"("group_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "notification_preferences_user_id_event_type_code_channel_id_key" ON "notification_preferences"("user_id", "event_type_code", "channel_id");

-- CreateIndex
CREATE UNIQUE INDEX "vaults_member_id_key" ON "vaults"("member_id");

-- CreateIndex
CREATE UNIQUE INDEX "currencies_code_key" ON "currencies"("code");

-- CreateIndex
CREATE UNIQUE INDEX "payment_methods_code_key" ON "payment_methods"("code");

-- CreateIndex
CREATE UNIQUE INDEX "event_types_code_key" ON "event_types"("code");

-- CreateIndex
CREATE UNIQUE INDEX "kyc_levels_code_key" ON "kyc_levels"("code");

-- CreateIndex
CREATE UNIQUE INDEX "kyc_providers_code_key" ON "kyc_providers"("code");

-- CreateIndex
CREATE UNIQUE INDEX "kyc_document_types_code_key" ON "kyc_document_types"("code");

-- CreateIndex
CREATE UNIQUE INDEX "member_share_cache_member_id_key" ON "member_share_cache"("member_id");

-- CreateIndex
CREATE INDEX "transactions_vault_id_created_at_idx" ON "transactions"("vault_id", "created_at");

-- CreateIndex
CREATE INDEX "transactions_group_id_created_at_idx" ON "transactions"("group_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "vote_responses_vote_id_member_id_key" ON "vote_responses"("vote_id", "member_id");

-- AddForeignKey
ALTER TABLE "user_identities" ADD CONSTRAINT "user_identities_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_identities" ADD CONSTRAINT "user_identities_provider_code_fkey" FOREIGN KEY ("provider_code") REFERENCES "auth_providers"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verification_tokens" ADD CONSTRAINT "verification_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verification_tokens" ADD CONSTRAINT "verification_tokens_purpose_code_fkey" FOREIGN KEY ("purpose_code") REFERENCES "verification_token_purposes"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verification_tokens" ADD CONSTRAINT "verification_tokens_identity_id_fkey" FOREIGN KEY ("identity_id") REFERENCES "user_identities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "devices" ADD CONSTRAINT "devices_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "devices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_event_type_fkey" FOREIGN KEY ("event_type") REFERENCES "event_types"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contributions" ADD CONSTRAINT "contributions_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contributions" ADD CONSTRAINT "contributions_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "group_members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contributions" ADD CONSTRAINT "contributions_payment_method_code_fkey" FOREIGN KEY ("payment_method_code") REFERENCES "payment_methods"("code") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flow_rules" ADD CONSTRAINT "flow_rules_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flow_destinations" ADD CONSTRAINT "flow_destinations_flow_rule_id_fkey" FOREIGN KEY ("flow_rule_id") REFERENCES "flow_rules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flow_destinations" ADD CONSTRAINT "flow_destinations_vault_id_fkey" FOREIGN KEY ("vault_id") REFERENCES "vaults"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "groups" ADD CONSTRAINT "groups_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "groups" ADD CONSTRAINT "groups_currency_code_fkey" FOREIGN KEY ("currency_code") REFERENCES "currencies"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_members" ADD CONSTRAINT "group_members_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_members" ADD CONSTRAINT "group_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kyc_verifications" ADD CONSTRAINT "kyc_verifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kyc_verifications" ADD CONSTRAINT "kyc_verifications_level_code_fkey" FOREIGN KEY ("level_code") REFERENCES "kyc_levels"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kyc_verifications" ADD CONSTRAINT "kyc_verifications_provider_code_fkey" FOREIGN KEY ("provider_code") REFERENCES "kyc_providers"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kyc_documents" ADD CONSTRAINT "kyc_documents_kyc_verification_id_fkey" FOREIGN KEY ("kyc_verification_id") REFERENCES "kyc_verifications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kyc_documents" ADD CONSTRAINT "kyc_documents_document_type_code_fkey" FOREIGN KEY ("document_type_code") REFERENCES "kyc_document_types"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_event_type_code_fkey" FOREIGN KEY ("event_type_code") REFERENCES "event_types"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_event_type_code_fkey" FOREIGN KEY ("event_type_code") REFERENCES "event_types"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_channel_id_fkey" FOREIGN KEY ("channel_id") REFERENCES "notification_channels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_proposed_by_fkey" FOREIGN KEY ("proposed_by") REFERENCES "group_members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_source_vault_id_fkey" FOREIGN KEY ("source_vault_id") REFERENCES "vaults"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vaults" ADD CONSTRAINT "vaults_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vaults" ADD CONSTRAINT "vaults_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "group_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vaults" ADD CONSTRAINT "vaults_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_share_cache" ADD CONSTRAINT "member_share_cache_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "group_members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_vault_id_fkey" FOREIGN KEY ("vault_id") REFERENCES "vaults"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_payment_method_code_fkey" FOREIGN KEY ("payment_method_code") REFERENCES "payment_methods"("code") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_reversed_transaction_id_fkey" FOREIGN KEY ("reversed_transaction_id") REFERENCES "transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "votes" ADD CONSTRAINT "votes_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vote_responses" ADD CONSTRAINT "vote_responses_vote_id_fkey" FOREIGN KEY ("vote_id") REFERENCES "votes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vote_responses" ADD CONSTRAINT "vote_responses_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "group_members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
