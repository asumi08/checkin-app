-- Supabase Database Schema for QuickCheck Web App
-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard/project/_/sql)

-- 1. Create Customers Table
CREATE TABLE IF NOT EXISTS public.customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    check_in_count INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Create Check-Ins Log Table
CREATE TABLE IF NOT EXISTS public.check_ins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE,
    phone TEXT NOT NULL,
    name TEXT NOT NULL,
    check_in_number INT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.check_ins ENABLE ROW LEVEL SECURITY;

-- 4. Create Security Policies for Public Web Access
-- Customers Policies
DROP POLICY IF EXISTS "Allow public read access to customers" ON public.customers;
CREATE POLICY "Allow public read access to customers" ON public.customers FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public insert access to customers" ON public.customers;
CREATE POLICY "Allow public insert access to customers" ON public.customers FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update access to customers" ON public.customers;
CREATE POLICY "Allow public update access to customers" ON public.customers FOR UPDATE USING (true);

-- Check-Ins Policies
DROP POLICY IF EXISTS "Allow public read access to check_ins" ON public.check_ins;
CREATE POLICY "Allow public read access to check_ins" ON public.check_ins FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public insert access to check_ins" ON public.check_ins;
CREATE POLICY "Allow public insert access to check_ins" ON public.check_ins FOR INSERT WITH CHECK (true);

-- 5. Seed Initial Sample Data (Optional)
INSERT INTO public.customers (phone, name, check_in_count)
VALUES 
    ('+15550101', 'Alex Morgan', 3),
    ('+15550102', 'Jordan Lee', 7),
    ('+15550103', 'Taylor Swift', 12)
ON CONFLICT (phone) DO NOTHING;
