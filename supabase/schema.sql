-- ============================================
-- Campamento La Lucila 2026
-- Schema para Supabase
-- ============================================

-- Tabla de inscriptos
CREATE TABLE IF NOT EXISTS campers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  age INTEGER NOT NULL CHECK (age >= 12),
  gender TEXT NOT NULL CHECK (gender IN ('M', 'F', 'Otro')),
  church TEXT,
  medical_notes TEXT,
  emergency_contact TEXT NOT NULL,
  emergency_phone TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de inscripciones
CREATE TABLE IF NOT EXISTS enrollments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  camper_id UUID NOT NULL REFERENCES campers(id) ON DELETE CASCADE,
  camp_name TEXT NOT NULL DEFAULT 'La Lucila',
  camp_year INTEGER NOT NULL DEFAULT 2026,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled')),
  registered_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de pagos
CREATE TABLE IF NOT EXISTS payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  enrollment_id UUID NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'ARS',
  payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'transfer', 'card', 'other')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  reference TEXT,
  paid_at TIMESTAMPTZ DEFAULT NOW(),
  tier_label TEXT,
  tier_price DECIMAL(10,2)
);

-- Agregar columnas de tier si la tabla ya existe (ejecutar sin errores si ya existen)
DO $$ BEGIN
  ALTER TABLE payments ADD COLUMN IF NOT EXISTS tier_label TEXT;
  ALTER TABLE payments ADD COLUMN IF NOT EXISTS tier_price DECIMAL(10,2);
EXCEPTION WHEN others THEN NULL;
END $$;

-- Tabla de configuración
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insertar valores por defecto
INSERT INTO settings (key, value) VALUES
  ('camp_name', 'La Lucila'),
  ('camp_year', '2026'),
  ('start_date', ''),
  ('end_date', ''),
  ('registration_fee', '0'),
  ('currency', 'ARS'),
  ('tier1_label', 'Hasta Septiembre'),
  ('tier1_deadline', '2026-09-30'),
  ('tier1_price', '230000'),
  ('tier2_label', 'Hasta Noviembre'),
  ('tier2_deadline', '2026-11-30'),
  ('tier2_price', '270000'),
  ('tier3_label', 'Hasta Enero'),
  ('tier3_deadline', '2027-01-31'),
  ('tier3_price', '320000')
ON CONFLICT (key) DO NOTHING;

-- Índices
CREATE INDEX IF NOT EXISTS idx_enrollments_camper ON enrollments(camper_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_status ON enrollments(status);
CREATE INDEX IF NOT EXISTS idx_payments_enrollment ON payments(enrollment_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);

-- RLS (Row Level Security)
ALTER TABLE campers ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Políticas: acceso completo por ahora (ajustar según autenticación)
DROP POLICY IF EXISTS "Allow all on campers" ON campers;
DROP POLICY IF EXISTS "Allow all on enrollments" ON enrollments;
DROP POLICY IF EXISTS "Allow all on payments" ON payments;
DROP POLICY IF EXISTS "Allow all on settings" ON settings;
CREATE POLICY "Allow all on campers" ON campers FOR ALL USING (true);
CREATE POLICY "Allow all on enrollments" ON enrollments FOR ALL USING (true);
CREATE POLICY "Allow all on payments" ON payments FOR ALL USING (true);
CREATE POLICY "Allow all on settings" ON settings FOR ALL USING (true);
