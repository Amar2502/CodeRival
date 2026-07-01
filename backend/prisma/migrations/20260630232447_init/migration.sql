/*
  Warnings:

  - The values [PYTHON,JAVASCRIPT,TYPESCRIPT,GO,RUST] on the enum `Language` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the `ProblemExample` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "Language_new" AS ENUM ('CPP', 'JAVA');
ALTER TABLE "ProblemStarterCode" ALTER COLUMN "language" TYPE "Language_new" USING ("language"::text::"Language_new");
ALTER TABLE "Submission" ALTER COLUMN "language" TYPE "Language_new" USING ("language"::text::"Language_new");
ALTER TYPE "Language" RENAME TO "Language_old";
ALTER TYPE "Language_new" RENAME TO "Language";
DROP TYPE "public"."Language_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "ProblemExample" DROP CONSTRAINT "ProblemExample_problemId_fkey";

-- DropTable
DROP TABLE "ProblemExample";
