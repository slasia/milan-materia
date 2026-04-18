/*
  Warnings:

  - You are about to drop the column `stripePaymentId` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `stripeSessionId` on the `Order` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Order" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "customerEmail" TEXT,
    "customerName" TEXT,
    "customerPhone" TEXT,
    "subtotal" INTEGER NOT NULL,
    "discountAmt" INTEGER NOT NULL DEFAULT 0,
    "total" INTEGER NOT NULL,
    "promoCode" TEXT,
    "promotionId" INTEGER,
    "mpPreferenceId" TEXT,
    "mpPaymentId" TEXT,
    "paymentMethod" TEXT,
    "notes" TEXT,
    "shippingAddress" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Order" ("createdAt", "customerEmail", "customerName", "customerPhone", "discountAmt", "id", "notes", "paymentMethod", "promoCode", "promotionId", "shippingAddress", "status", "subtotal", "total", "updatedAt") SELECT "createdAt", "customerEmail", "customerName", "customerPhone", "discountAmt", "id", "notes", "paymentMethod", "promoCode", "promotionId", "shippingAddress", "status", "subtotal", "total", "updatedAt" FROM "Order";
DROP TABLE "Order";
ALTER TABLE "new_Order" RENAME TO "Order";
CREATE UNIQUE INDEX "Order_mpPreferenceId_key" ON "Order"("mpPreferenceId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
