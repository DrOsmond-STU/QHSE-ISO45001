/*
  Warnings:

  - Made the column `site_id` on table `capa_register` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "capa_register" DROP CONSTRAINT "capa_register_site_id_fkey";

-- AlterTable
ALTER TABLE "capa_register" ALTER COLUMN "site_id" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "capa_register" ADD CONSTRAINT "capa_register_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("site_id") ON DELETE RESTRICT ON UPDATE CASCADE;
