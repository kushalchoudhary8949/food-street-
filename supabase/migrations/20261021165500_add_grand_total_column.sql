-- Migration to add "grand Total" column to orders table in Supabase
ALTER TABLE orders ADD COLUMN IF NOT EXISTS "grand Total" NUMERIC;

-- Backfill "grand Total" from existing grand_total or data->>'grandTotal'
UPDATE orders
SET "grand Total" = COALESCE(
  grand_total,
  NULLIF(data->>'grandTotal', '')::numeric,
  NULLIF(data->>'grand_total', '')::numeric,
  0
)
WHERE "grand Total" IS NULL;

-- Also ensure grand_total matches "grand Total"
UPDATE orders
SET grand_total = "grand Total"
WHERE grand_total IS NULL OR grand_total = 0;
