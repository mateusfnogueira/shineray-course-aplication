-- AlterTable
ALTER TABLE "users" ADD COLUMN     "login_blocked_until" TIMESTAMP(3),
ADD COLUMN     "login_failed_attempts" INTEGER NOT NULL DEFAULT 0;
