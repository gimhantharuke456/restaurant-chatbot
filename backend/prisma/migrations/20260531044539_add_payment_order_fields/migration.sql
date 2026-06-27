-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "checkoutUrl" TEXT,
ADD COLUMN     "orderItems" JSONB;
