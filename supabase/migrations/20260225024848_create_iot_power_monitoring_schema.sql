-- IoT Power Monitoring System Schema
-- 
-- Overview:
-- Complete schema for IoT-based electricity monitoring system
-- 
-- Tables:
-- 1. switches - Stores information about each electrical switch/device
-- 2. power_readings - All power consumption readings from IoT device
-- 3. eb_tariff_slabs - Electricity board tariff configuration
-- 4. billing_settings - Billing configuration
-- 5. daily_usage_summary - Aggregated daily usage data

-- Create switches table
CREATE TABLE IF NOT EXISTS switches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT '',
  device_type text NOT NULL DEFAULT 'bulb',
  is_on boolean DEFAULT false,
  switch_number integer NOT NULL CHECK (switch_number BETWEEN 1 AND 4),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create power_readings table
CREATE TABLE IF NOT EXISTS power_readings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  switch_id uuid REFERENCES switches(id) ON DELETE CASCADE,
  voltage double precision DEFAULT 0,
  current double precision DEFAULT 0,
  power double precision DEFAULT 0,
  energy double precision DEFAULT 0,
  reading_time timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_power_readings_switch_id ON power_readings(switch_id);
CREATE INDEX IF NOT EXISTS idx_power_readings_time ON power_readings(reading_time DESC);

-- Create EB tariff slabs table
CREATE TABLE IF NOT EXISTS eb_tariff_slabs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  min_units integer NOT NULL,
  max_units integer,
  rate_per_unit decimal(10, 2) NOT NULL,
  slab_order integer NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create billing settings table
CREATE TABLE IF NOT EXISTS billing_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  billing_months integer DEFAULT 1 CHECK (billing_months > 0),
  current_month_start date DEFAULT CURRENT_DATE,
  updated_at timestamptz DEFAULT now()
);

-- Create daily usage summary table
CREATE TABLE IF NOT EXISTS daily_usage_summary (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usage_date date NOT NULL,
  switch_id uuid REFERENCES switches(id) ON DELETE CASCADE,
  total_energy double precision DEFAULT 0,
  total_hours double precision DEFAULT 0,
  avg_power double precision DEFAULT 0,
  cost decimal(10, 2) DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(usage_date, switch_id)
);

-- Create index for daily summary queries
CREATE INDEX IF NOT EXISTS idx_daily_usage_date ON daily_usage_summary(usage_date DESC);

-- Enable Row Level Security
ALTER TABLE switches ENABLE ROW LEVEL SECURITY;
ALTER TABLE power_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE eb_tariff_slabs ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_usage_summary ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (IoT device data)
CREATE POLICY "Allow public read access to switches"
  ON switches FOR SELECT
  USING (true);

CREATE POLICY "Allow public insert to switches"
  ON switches FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public update to switches"
  ON switches FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public read access to power_readings"
  ON power_readings FOR SELECT
  USING (true);

CREATE POLICY "Allow public insert to power_readings"
  ON power_readings FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public read access to eb_tariff_slabs"
  ON eb_tariff_slabs FOR SELECT
  USING (true);

CREATE POLICY "Allow public insert to eb_tariff_slabs"
  ON eb_tariff_slabs FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public update to eb_tariff_slabs"
  ON eb_tariff_slabs FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public delete from eb_tariff_slabs"
  ON eb_tariff_slabs FOR DELETE
  USING (true);

CREATE POLICY "Allow public read access to billing_settings"
  ON billing_settings FOR SELECT
  USING (true);

CREATE POLICY "Allow public insert to billing_settings"
  ON billing_settings FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public update to billing_settings"
  ON billing_settings FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public read access to daily_usage_summary"
  ON daily_usage_summary FOR SELECT
  USING (true);

CREATE POLICY "Allow public insert to daily_usage_summary"
  ON daily_usage_summary FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public update to daily_usage_summary"
  ON daily_usage_summary FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Insert default 4 switches
INSERT INTO switches (name, device_type, switch_number, is_on) VALUES
  ('Switch 1', 'bulb', 1, false),
  ('Switch 2', 'fan', 2, false),
  ('Switch 3', 'tv', 3, false),
  ('Switch 4', 'fridge', 4, false)
ON CONFLICT DO NOTHING;

-- Insert default EB tariff slabs (Tamil Nadu example)
INSERT INTO eb_tariff_slabs (min_units, max_units, rate_per_unit, slab_order) VALUES
  (0, 100, 0, 1),
  (101, 200, 2.50, 2),
  (201, 500, 4.60, 3),
  (501, NULL, 6.60, 4)
ON CONFLICT DO NOTHING;

-- Insert default billing settings
INSERT INTO billing_settings (billing_months, current_month_start) VALUES
  (1, CURRENT_DATE)
ON CONFLICT DO NOTHING;