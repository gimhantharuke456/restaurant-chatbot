-- Add missing columns to Restaurant table
ALTER TABLE "Restaurant"
  ADD COLUMN IF NOT EXISTS "latitude"        DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "longitude"       DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "socialMedia"     JSONB,
  ADD COLUMN IF NOT EXISTS "totalSeats"      INTEGER,
  ADD COLUMN IF NOT EXISTS "profileImageUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "coverImageUrl"   TEXT;

-- ComplaintStatus enum
DO $$ BEGIN
  CREATE TYPE "ComplaintStatus" AS ENUM ('OPEN', 'UNDER_REVIEW', 'RESOLVED', 'CLOSED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- LoyaltyTier enum
DO $$ BEGIN
  CREATE TYPE "LoyaltyTier" AS ENUM ('BRONZE', 'SILVER', 'GOLD', 'PLATINUM');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- LoyaltyTxType enum
DO $$ BEGIN
  CREATE TYPE "LoyaltyTxType" AS ENUM ('EARN_RESERVATION', 'EARN_REVIEW', 'EARN_PAYMENT', 'REDEEM', 'ADJUSTMENT');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- RestaurantHoliday table
CREATE TABLE IF NOT EXISTS "RestaurantHoliday" (
  "id"           TEXT        NOT NULL,
  "restaurantId" TEXT        NOT NULL,
  "date"         DATE        NOT NULL,
  "reason"       TEXT,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RestaurantHoliday_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "RestaurantHoliday_restaurantId_date_key"
  ON "RestaurantHoliday"("restaurantId", "date");

CREATE INDEX IF NOT EXISTS "RestaurantHoliday_restaurantId_idx"
  ON "RestaurantHoliday"("restaurantId");

ALTER TABLE "RestaurantHoliday"
  DROP CONSTRAINT IF EXISTS "RestaurantHoliday_restaurantId_fkey";
ALTER TABLE "RestaurantHoliday"
  ADD CONSTRAINT "RestaurantHoliday_restaurantId_fkey"
    FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Complaint table
CREATE TABLE IF NOT EXISTS "Complaint" (
  "id"           TEXT              NOT NULL,
  "userId"       TEXT              NOT NULL,
  "restaurantId" TEXT,
  "subject"      TEXT              NOT NULL,
  "description"  TEXT              NOT NULL,
  "status"       "ComplaintStatus" NOT NULL DEFAULT 'OPEN',
  "adminNote"    TEXT,
  "resolvedAt"   TIMESTAMP(3),
  "createdAt"    TIMESTAMP(3)      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"    TIMESTAMP(3)      NOT NULL,
  CONSTRAINT "Complaint_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Complaint_userId_idx"  ON "Complaint"("userId");
CREATE INDEX IF NOT EXISTS "Complaint_status_idx"  ON "Complaint"("status");

ALTER TABLE "Complaint"
  DROP CONSTRAINT IF EXISTS "Complaint_userId_fkey";
ALTER TABLE "Complaint"
  ADD CONSTRAINT "Complaint_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE "Complaint"
  DROP CONSTRAINT IF EXISTS "Complaint_restaurantId_fkey";
ALTER TABLE "Complaint"
  ADD CONSTRAINT "Complaint_restaurantId_fkey"
    FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- DeviceToken table
CREATE TABLE IF NOT EXISTS "DeviceToken" (
  "id"        TEXT         NOT NULL,
  "userId"    TEXT         NOT NULL,
  "token"     TEXT         NOT NULL,
  "platform"  TEXT         NOT NULL DEFAULT 'web',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DeviceToken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "DeviceToken_token_key" ON "DeviceToken"("token");
CREATE INDEX IF NOT EXISTS "DeviceToken_userId_idx"       ON "DeviceToken"("userId");

ALTER TABLE "DeviceToken"
  DROP CONSTRAINT IF EXISTS "DeviceToken_userId_fkey";
ALTER TABLE "DeviceToken"
  ADD CONSTRAINT "DeviceToken_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- LoyaltyAccount table
CREATE TABLE IF NOT EXISTS "LoyaltyAccount" (
  "id"          TEXT          NOT NULL,
  "userId"      TEXT          NOT NULL,
  "points"      INTEGER       NOT NULL DEFAULT 0,
  "tier"        "LoyaltyTier" NOT NULL DEFAULT 'BRONZE',
  "totalEarned" INTEGER       NOT NULL DEFAULT 0,
  "createdAt"   TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3)  NOT NULL,
  CONSTRAINT "LoyaltyAccount_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "LoyaltyAccount_userId_key" ON "LoyaltyAccount"("userId");

ALTER TABLE "LoyaltyAccount"
  DROP CONSTRAINT IF EXISTS "LoyaltyAccount_userId_fkey";
ALTER TABLE "LoyaltyAccount"
  ADD CONSTRAINT "LoyaltyAccount_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- LoyaltyTransaction table
CREATE TABLE IF NOT EXISTS "LoyaltyTransaction" (
  "id"          TEXT             NOT NULL,
  "accountId"   TEXT             NOT NULL,
  "points"      INTEGER          NOT NULL,
  "type"        "LoyaltyTxType"  NOT NULL,
  "description" TEXT             NOT NULL,
  "referenceId" TEXT,
  "createdAt"   TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LoyaltyTransaction_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "LoyaltyTransaction_accountId_idx" ON "LoyaltyTransaction"("accountId");

ALTER TABLE "LoyaltyTransaction"
  DROP CONSTRAINT IF EXISTS "LoyaltyTransaction_accountId_fkey";
ALTER TABLE "LoyaltyTransaction"
  ADD CONSTRAINT "LoyaltyTransaction_accountId_fkey"
    FOREIGN KEY ("accountId") REFERENCES "LoyaltyAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
