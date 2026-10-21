-- Migration: Add customer detail columns to orders table: name, room No., Hostel, contact
-- Supports both exact quoted names ("room No.", "Hostel") and snake_case (room_no, hostel) for maximum compatibility.

ALTER TABLE orders 
  ADD COLUMN IF NOT EXISTS name text DEFAULT '',
  ADD COLUMN IF NOT EXISTS "room No." text DEFAULT '',
  ADD COLUMN IF NOT EXISTS room_no text DEFAULT '',
  ADD COLUMN IF NOT EXISTS "Hostel" text DEFAULT '',
  ADD COLUMN IF NOT EXISTS hostel text DEFAULT '',
  ADD COLUMN IF NOT EXISTS contact text DEFAULT '';

-- Backfill existing orders from data JSONB column
UPDATE orders
SET 
  contact = COALESCE(NULLIF(contact, ''), NULLIF(data->>'customerPhone', ''), NULLIF(data->>'contact', ''), ''),
  name = COALESCE(
    NULLIF(name, ''),
    NULLIF(data->>'customerName', ''),
    NULLIF(data->>'name', ''),
    TRIM(substring(data->>'deliveryAddress' from '(?i)Name:\s*([^,]+)')),
    ''
  ),
  room_no = COALESCE(
    NULLIF(room_no, ''),
    NULLIF(data->>'roomNo', ''),
    NULLIF(data->>'room_no', ''),
    TRIM(substring(data->>'deliveryAddress' from '(?i)Room\s+([A-Za-z0-9\-]+)')),
    ''
  ),
  hostel = COALESCE(
    NULLIF(hostel, ''),
    NULLIF(data->>'hostel', ''),
    NULLIF(data->>'hostelName', ''),
    TRIM(substring(data->>'deliveryAddress' from '(?i)(Mojo\s*[A-Za-z0-9\s]*|Los Altos\s*[A-Za-z0-9\s]*|Janadhar[A-Za-z0-9\s]*)')),
    ''
  );

-- Sync the dual-case columns
UPDATE orders
SET
  "room No." = room_no,
  "Hostel" = hostel;

-- Also update data JSONB to reflect these parsed/assigned columns
UPDATE orders
SET data = data || jsonb_build_object(
  'name', name,
  'roomNo', room_no,
  'hostel', hostel,
  'contact', contact
);
