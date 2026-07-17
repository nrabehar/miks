-- Partial unique index: a (group_id, user_id) pair is unique only among
-- ACTIVE rows, so a LEFT history row can coexist with a later new ACTIVE
-- row created by rejoining through a fresh invite. Prisma schema syntax
-- cannot express a WHERE-scoped unique constraint, so this is hand written.
-- The plain (group_id, user_id) index from the prior migration stays as is,
-- for lookups across all statuses.
CREATE UNIQUE INDEX "group_members_group_id_user_id_active_key" ON "group_members"("group_id", "user_id") WHERE "status" = 'ACTIVE';

-- CHECK constraint: a Vote's subject_type must match exactly one of
-- project_id / target_member_id being set. Prisma schema cannot express a
-- conditional cross-column constraint, so this is hand written.
ALTER TABLE "votes" ADD CONSTRAINT "votes_subject_type_target_check" CHECK (
  ("subject_type" = 'PROJECT' AND "project_id" IS NOT NULL AND "target_member_id" IS NULL)
  OR
  ("subject_type" = 'MEMBER_REMOVAL' AND "target_member_id" IS NOT NULL AND "project_id" IS NULL)
);
