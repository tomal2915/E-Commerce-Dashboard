/*
  Warnings:

  - You are about to drop the column `categoryId` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `description` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `products` table. All the data in the column will be lost.
  - You are about to drop the `product_variant_media` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[attributeId,value]` on the table `attribute_values` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `slug` to the `attribute_values` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "public"."product_variant_media" DROP CONSTRAINT "product_variant_media_variantId_fkey";

-- DropForeignKey
ALTER TABLE "public"."products" DROP CONSTRAINT "products_categoryId_fkey";

-- AlterTable
ALTER TABLE "attribute_values" ADD COLUMN     "referenceMediaId" TEXT,
ADD COLUMN     "referenceValue" TEXT,
ADD COLUMN     "slug" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "product_media" ADD COLUMN     "attributeValueId" TEXT,
ADD COLUMN     "isGallery" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "variantId" TEXT,
ALTER COLUMN "productId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "product_variants" ADD COLUMN     "activeFlag" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "lowStockThreshold" INTEGER DEFAULT 5,
ADD COLUMN     "stockStatus" TEXT,
ADD COLUMN     "weight" DECIMAL(10,2);

-- AlterTable
ALTER TABLE "products" DROP COLUMN "categoryId",
DROP COLUMN "description",
DROP COLUMN "status",
ADD COLUMN     "activeFlag" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "featuredFlag" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "longDescription" TEXT,
ADD COLUMN     "shortDescription" TEXT,
ADD COLUMN     "sortOrder" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "stockStatus" TEXT,
ADD COLUMN     "weight" DECIMAL(10,2);

-- DropTable
DROP TABLE "public"."product_variant_media";

-- CreateIndex
CREATE UNIQUE INDEX "attribute_values_attributeId_value_key" ON "attribute_values"("attributeId", "value");

-- AddForeignKey
ALTER TABLE "attribute_values" ADD CONSTRAINT "attribute_values_referenceMediaId_fkey" FOREIGN KEY ("referenceMediaId") REFERENCES "media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_media" ADD CONSTRAINT "product_media_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "media"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_media" ADD CONSTRAINT "product_media_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "product_variants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_media" ADD CONSTRAINT "product_media_attributeValueId_fkey" FOREIGN KEY ("attributeValueId") REFERENCES "attribute_values"("id") ON DELETE CASCADE ON UPDATE CASCADE;
