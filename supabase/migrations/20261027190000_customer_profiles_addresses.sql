-- Migration: Customer Profile & Delivery Address Management and Order Delivery Snapshots
-- Filename: 20261027190000_customer_profiles_addresses.sql

-- 1. Extend users table with profile fields
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS hostel_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS room_no VARCHAR(50),
  ADD COLUMN IF NOT EXISTS block VARCHAR(50),
  ADD COLUMN IF NOT EXISTS floor VARCHAR(50),
  ADD COLUMN IF NOT EXISTS landmark VARCHAR(255);

-- 2. Create customer addresses table
CREATE TABLE IF NOT EXISTS public.addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  label VARCHAR(50) NOT NULL DEFAULT 'Hostel',
  name VARCHAR(255),
  phone VARCHAR(20),
  hostel_name VARCHAR(255),
  room_no VARCHAR(50),
  block VARCHAR(50),
  floor VARCHAR(50),
  address_line TEXT,
  locality VARCHAR(255) DEFAULT 'Campus',
  city VARCHAR(100) DEFAULT 'Campus',
  instructions TEXT,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_addresses_user_id ON public.addresses (user_id);
CREATE INDEX IF NOT EXISTS idx_addresses_user_default ON public.addresses (user_id, is_default);

-- 3. Extend orders table with customer reference and immutable delivery snapshot fields
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS customer_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS customer_phone VARCHAR(20),
  ADD COLUMN IF NOT EXISTS delivery_hostel VARCHAR(255),
  ADD COLUMN IF NOT EXISTS delivery_room_no VARCHAR(50),
  ADD COLUMN IF NOT EXISTS delivery_block VARCHAR(50),
  ADD COLUMN IF NOT EXISTS delivery_floor VARCHAR(50),
  ADD COLUMN IF NOT EXISTS delivery_landmark VARCHAR(255),
  ADD COLUMN IF NOT EXISTS delivery_address_line TEXT,
  ADD COLUMN IF NOT EXISTS delivery_instructions TEXT,
  ADD COLUMN IF NOT EXISTS delivery_snapshot JSONB;

CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders (user_id);
