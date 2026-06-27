-- Add reservationId and imageUrls to Review, add updatedAt with default for existing rows
ALTER TABLE "Review" ADD COLUMN "reservationId" TEXT;
ALTER TABLE "Review" ADD COLUMN "imageUrls" TEXT NOT NULL DEFAULT '[]';
ALTER TABLE "Review" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Add unique constraint on reservationId
CREATE UNIQUE INDEX "Review_reservationId_key" ON "Review"("reservationId");

-- Add foreign key for reservationId
ALTER TABLE "Review" ADD CONSTRAINT "Review_reservationId_fkey"
  FOREIGN KEY ("reservationId") REFERENCES "Reservation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
