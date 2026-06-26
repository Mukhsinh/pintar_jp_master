-- ============================================
-- JASPEL: Enterprise Incentive & KPI System
-- Database Schema with RLS Policies
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- MASTER DATA TABLES
-- ============================================

-- Master Units (Organizational Units)
CREATE TABLE IF NOT EXISTS m_units (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  proportion_percentage DECIMAL(5,2) NOT NULL DEFAULT 0.00 CHECK (proportion_percentage >= 0 AND proportion_percentage <= 100),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Master Employees
CREATE TABLE IF NOT EXISTS m_employees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_code VARCHAR(50) UNIQUE NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  unit_id UUID NOT NULL REFERENCES m_units(id) ON DELETE RESTRICT,
  role VARCHAR(50) NOT NULL CHECK (role IN ('superadmin', 'unit_manager', 'employee')),
  email VARCHAR(255) UNIQUE NOT NULL,
  tax_status VARCHAR(10) DEFAULT 'TK/0' CHECK (tax_status IN ('TK/0', 'TK/1', 'TK/2', 'TK/3', 'K/0', 'K/1', 'K/2', 'K/3')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Master KPI Categories (P1, P2, P3 per Unit)
CREATE TABLE IF NOT EXISTS m_kpi_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  unit_id UUID NOT NULL REFERENCES m_units(id) ON DELETE CASCADE,
  category VARCHAR(10) NOT NULL CHECK (category IN ('P1', 'P2', 'P3')),
  category_name VARCHAR(255) NOT NULL,
  weight_percentage DECIMAL(5,2) NOT NULL CHECK (weight_percentage >= 0 AND weight_percentage <= 100),
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(unit_id, category)
);

-- Master KPI Indicators (Detail indicators per category)
CREATE TABLE IF NOT EXISTS m_kpi_indicators (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_id UUID NOT NULL REFERENCES m_kpi_categories(id) ON DELETE CASCADE,
  code VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  target_value DECIMAL(15,2) DEFAULT 100.00,
  weight_percentage DECIMAL(5,2) NOT NULL CHECK (weight_percentage >= 0 AND weight_percentage <= 100),
  measurement_unit VARCHAR(50),
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(category_id, code)
);

-- ============================================
-- TRANSACTION TABLES
-- ============================================

-- Pool Dana (Financial Pool per Period)
CREATE TABLE IF NOT EXISTS t_pool (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  period VARCHAR(7) NOT NULL, -- Format: YYYY-MM
  revenue_total DECIMAL(18,2) NOT NULL DEFAULT 0.00,
  deduction_total DECIMAL(18,2) NOT NULL DEFAULT 0.00,
  net_pool DECIMAL(18,2) GENERATED ALWAYS AS (revenue_total - deduction_total) STORED,
  global_allocation_percentage DECIMAL(5,2) NOT NULL DEFAULT 100.00 CHECK (global_allocation_percentage >= 0 AND global_allocation_percentage <= 100),
  allocated_amount DECIMAL(18,2) GENERATED ALWAYS AS ((revenue_total - deduction_total) * global_allocation_percentage / 100) STORED,
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'distributed')),
  approved_by UUID REFERENCES m_employees(id),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(period)
);

-- Pool Revenue Details
CREATE TABLE IF NOT EXISTS t_pool_revenue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pool_id UUID NOT NULL REFERENCES t_pool(id) ON DELETE CASCADE,
  description VARCHAR(255) NOT NULL,
  amount DECIMAL(18,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pool Deduction Details
CREATE TABLE IF NOT EXISTS t_pool_deduction (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pool_id UUID NOT NULL REFERENCES t_pool(id) ON DELETE CASCADE,
  description VARCHAR(255) NOT NULL,
  amount DECIMAL(18,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- KPI Realization (Input data per employee per indicator)
CREATE TABLE IF NOT EXISTS t_realization (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES m_employees(id) ON DELETE CASCADE,
  indicator_id UUID NOT NULL REFERENCES m_kpi_indicators(id) ON DELETE CASCADE,
  period VARCHAR(7) NOT NULL,
  realization_value DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  achievement_percentage DECIMAL(5,2),
  score DECIMAL(10,2),
  notes TEXT,
  created_by UUID REFERENCES m_employees(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(employee_id, indicator_id, period)
);

-- Unit Score Summary (Aggregated unit performance)
CREATE TABLE IF NOT EXISTS t_unit_scores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  unit_id UUID NOT NULL REFERENCES m_units(id) ON DELETE CASCADE,
  period VARCHAR(7) NOT NULL,
  total_score DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  unit_weight_percentage DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  weighted_score DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  unit_allocated_amount DECIMAL(18,2) DEFAULT 0.00,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(unit_id, period)
);

-- Individual Score Summary (P1, P2, P3 breakdown)
CREATE TABLE IF NOT EXISTS t_individual_scores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES m_employees(id) ON DELETE CASCADE,
  period VARCHAR(7) NOT NULL,
  p1_score DECIMAL(10,2) DEFAULT 0.00,
  p2_score DECIMAL(10,2) DEFAULT 0.00,
  p3_score DECIMAL(10,2) DEFAULT 0.00,
  p1_weighted DECIMAL(10,2) DEFAULT 0.00,
  p2_weighted DECIMAL(10,2) DEFAULT 0.00,
  p3_weighted DECIMAL(10,2) DEFAULT 0.00,
  individual_total_score DECIMAL(10,2) DEFAULT 0.00,
  individual_weight_percentage DECIMAL(5,2) NOT NULL DEFAULT 100.00,
  weighted_individual_score DECIMAL(10,2) DEFAULT 0.00,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(employee_id, period)
);

-- Final Calculation Results (Audit trail & distribution)
CREATE TABLE IF NOT EXISTS t_calculation_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES m_employees(id) ON DELETE CASCADE,
  period VARCHAR(7) NOT NULL,
  pool_id UUID NOT NULL REFERENCES t_pool(id) ON DELETE CASCADE,
  unit_score DECIMAL(10,2) DEFAULT 0.00,
  individual_score DECIMAL(10,2) DEFAULT 0.00,
  final_score DECIMAL(10,2) DEFAULT 0.00,
  unit_allocated_amount DECIMAL(18,2) DEFAULT 0.00,
  score_proportion DECIMAL(10,6) DEFAULT 0.00,
  gross_incentive DECIMAL(18,2) DEFAULT 0.00,
  tax_amount DECIMAL(18,2) DEFAULT 0.00,
  net_incentive DECIMAL(18,2) DEFAULT 0.00,
  calculation_metadata JSONB,
  calculated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(employee_id, period)
);

-- Calculation Log
CREATE TABLE IF NOT EXISTS t_calculation_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  period VARCHAR(7) NOT NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('success', 'error')),
  employee_count INTEGER DEFAULT 0,
  error_message TEXT,
  error_details JSONB,
  started_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit Log Table
CREATE TABLE IF NOT EXISTS t_audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_id UUID REFERENCES m_employees(id),
  user_name TEXT,
  table_name TEXT NOT NULL,
  operation TEXT NOT NULL CHECK (operation IN ('CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'ACCESS')),
  record_id TEXT,
  ip_address TEXT,
  old_value JSONB,
  new_value JSONB,
  details TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Authentication Log Table
CREATE TABLE IF NOT EXISTS t_auth_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES m_employees(id),
  action TEXT NOT NULL CHECK (action IN ('LOGIN', 'LOGOUT', 'FAILED_LOGIN')),
  ip_address TEXT,
  user_agent TEXT,
  success BOOLEAN NOT NULL DEFAULT true,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Notifications Table
CREATE TABLE IF NOT EXISTS t_notification (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES m_employees(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('pool_approval', 'calculation_complete', 'password_reset', 'new_user', 'general')),
  read BOOLEAN NOT NULL DEFAULT false,
  link TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  read_at TIMESTAMPTZ
);

-- Settings Table
CREATE TABLE IF NOT EXISTS t_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL,
  description TEXT,
  updated_by UUID REFERENCES m_employees(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- KPI Assessments table
CREATE TABLE IF NOT EXISTS t_kpi_assessments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES m_employees(id) ON DELETE CASCADE,
  indicator_id UUID NOT NULL REFERENCES m_kpi_indicators(id) ON DELETE CASCADE,
  period VARCHAR(7) NOT NULL, -- Format: YYYY-MM
  realization_value DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  target_value DECIMAL(15,2) NOT NULL,
  weight_percentage DECIMAL(5,2) NOT NULL,
  achievement_percentage DECIMAL(5,2) GENERATED ALWAYS AS (
    CASE 
      WHEN target_value > 0 THEN ROUND((realization_value / target_value * 100)::numeric, 2)
      ELSE 0 
    END
  ) STORED,
  score DECIMAL(10,2) GENERATED ALWAYS AS (
    CASE 
      WHEN target_value > 0 AND (realization_value / target_value * 100) >= 100 THEN 100
      WHEN target_value > 0 THEN ROUND((realization_value / target_value * 100)::numeric, 2)
      ELSE 0 
    END
  ) STORED,
  notes TEXT,
  assessor_id UUID NOT NULL REFERENCES m_employees(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(employee_id, indicator_id, period)
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_employees_unit ON m_employees(unit_id);
CREATE INDEX IF NOT EXISTS idx_employees_role ON m_employees(role);
CREATE INDEX IF NOT EXISTS idx_kpi_categories_unit ON m_kpi_categories(unit_id);
CREATE INDEX IF NOT EXISTS idx_kpi_indicators_category ON m_kpi_indicators(category_id);
CREATE INDEX IF NOT EXISTS idx_realization_employee ON t_realization(employee_id);
CREATE INDEX IF NOT EXISTS idx_realization_period ON t_realization(period);
CREATE INDEX IF NOT EXISTS idx_pool_period ON t_pool(period);
CREATE INDEX IF NOT EXISTS idx_calculation_period ON t_calculation_results(period);
CREATE INDEX IF NOT EXISTS idx_calculation_employee ON t_calculation_results(employee_id);
CREATE INDEX IF NOT EXISTS idx_calculation_log_period ON t_calculation_log(period);
CREATE INDEX IF NOT EXISTS idx_calculation_log_status ON t_calculation_log(status);
CREATE INDEX IF NOT EXISTS idx_audit_log_timestamp ON t_audit_log(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON t_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_table_name ON t_audit_log(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_log_operation ON t_audit_log(operation);
CREATE INDEX IF NOT EXISTS idx_auth_log_user_id ON t_auth_log(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_log_created_at ON t_auth_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notification_user_id ON t_notification(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_read ON t_notification(read);
CREATE INDEX IF NOT EXISTS idx_notification_created_at ON t_notification(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_settings_key ON t_settings(key);
CREATE INDEX IF NOT EXISTS idx_assessments_employee_period ON t_kpi_assessments(employee_id, period);
CREATE INDEX IF NOT EXISTS idx_assessments_period ON t_kpi_assessments(period);
CREATE INDEX IF NOT EXISTS idx_assessments_assessor ON t_kpi_assessments(assessor_id);
CREATE INDEX IF NOT EXISTS idx_assessments_indicator ON t_kpi_assessments(indicator_id);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE m_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE m_employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE m_kpi_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE m_kpi_indicators ENABLE ROW LEVEL SECURITY;
ALTER TABLE t_pool ENABLE ROW LEVEL SECURITY;
ALTER TABLE t_pool_revenue ENABLE ROW LEVEL SECURITY;
ALTER TABLE t_pool_deduction ENABLE ROW LEVEL SECURITY;
ALTER TABLE t_realization ENABLE ROW LEVEL SECURITY;
ALTER TABLE t_unit_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE t_individual_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE t_calculation_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE t_calculation_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE t_kpi_assessments ENABLE ROW LEVEL SECURITY;

-- Helper functions
CREATE OR REPLACE FUNCTION is_superadmin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM m_employees 
    WHERE email = auth.jwt() ->> 'email' 
    AND role = 'superadmin'
    AND is_active = true
  );
$$ LANGUAGE SQL SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_current_employee()
RETURNS UUID AS $$
  SELECT id FROM m_employees WHERE email = auth.jwt() ->> 'email' LIMIT 1;
$$ LANGUAGE SQL SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_user_unit_id()
RETURNS UUID AS $$
  SELECT unit_id FROM m_employees WHERE email = auth.jwt() ->> 'email' LIMIT 1;
$$ LANGUAGE SQL SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_unit_manager()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM m_employees 
    WHERE email = auth.jwt() ->> 'email' 
    AND role = 'unit_manager'
    AND is_active = true
  );
$$ LANGUAGE SQL SECURITY DEFINER;

CREATE OR REPLACE FUNCTION can_assess_employee(employee_uuid UUID)
RETURNS BOOLEAN AS $$
  -- Superadmin can assess anyone
  -- Unit managers can only assess employees in their unit
  SELECT EXISTS (
    SELECT 1 FROM m_employees current_user
    WHERE current_user.email = auth.jwt() ->> 'email'
    AND current_user.is_active = true
    AND (
      current_user.role = 'superadmin'
      OR (
        current_user.role = 'unit_manager'
        AND EXISTS (
          SELECT 1 FROM m_employees target
          WHERE target.id = employee_uuid
          AND target.unit_id = current_user.unit_id
        )
      )
    )
  );
$$ LANGUAGE SQL SECURITY DEFINER;

-- Policies (Simplified for re-run)
DO $$
BEGIN
  -- Unit policies
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Superadmin full access to units') THEN
    CREATE POLICY "Superadmin full access to units" ON m_units FOR ALL USING (is_superadmin());
  END IF;
  
  -- Employee policies
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Superadmin full access to employees') THEN
    CREATE POLICY "Superadmin full access to employees" ON m_employees FOR ALL USING (is_superadmin());
  END IF;

  -- KPI Assessment policies
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'assessment_access_policy') THEN
    CREATE POLICY assessment_access_policy ON t_kpi_assessments FOR ALL USING (can_assess_employee(employee_id));
  END IF;
END $$;

-- ============================================
-- TRIGGERS
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers to all tables that have it
DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE 'm_%' OR table_name LIKE 't_%'
  LOOP
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = t AND column_name = 'updated_at') THEN
      EXECUTE format('DROP TRIGGER IF EXISTS %I ON %I', 'update_' || t || '_updated_at', t);
      EXECUTE format('CREATE TRIGGER %I BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()', 'update_' || t || '_updated_at', t);
    END IF;
  END LOOP;
END $$;

-- ============================================
-- VIEWS
-- ============================================

CREATE OR REPLACE VIEW v_assessment_status AS
SELECT 
  e.id as employee_id,
  e.full_name,
  e.unit_id,
  u.name as unit_name,
  p.period,
  COUNT(i.id) as total_indicators,
  COUNT(a.id) as assessed_indicators,
  CASE 
    WHEN COUNT(a.id) = 0 THEN 'Belum Dinilai'
    WHEN COUNT(a.id) = COUNT(i.id) THEN 'Selesai'
    ELSE 'Sebagian'
  END as status,
  ROUND((COUNT(a.id)::decimal / NULLIF(COUNT(i.id), 0) * 100), 2) as completion_percentage
FROM m_employees e
JOIN m_units u ON e.unit_id = u.id
CROSS JOIN (
  SELECT DISTINCT period 
  FROM t_pool 
  WHERE status IN ('approved', 'distributed')
  ORDER BY period DESC
  LIMIT 12
) p
LEFT JOIN m_kpi_categories c ON c.unit_id = e.unit_id AND c.is_active = true
LEFT JOIN m_kpi_indicators i ON i.category_id = c.id AND i.is_active = true
LEFT JOIN t_kpi_assessments a ON a.employee_id = e.id 
  AND a.indicator_id = i.id 
  AND a.period = p.period
WHERE e.is_active = true
GROUP BY e.id, e.full_name, e.unit_id, u.name, p.period;

-- ============================================
-- SEED DATA (CORE)
-- ============================================

INSERT INTO t_settings (key, value, description) VALUES
  ('company_info', '{"name": "JASPEL Enterprise", "address": "Jakarta, Indonesia", "logo": ""}', 'Company information for reports'),
  ('tax_rates', '{"TK0": 5, "K0": 5, "K1": 15, "K2": 25, "K3": 30}', 'Tax rates by status (percentage)'),
  ('calculation_params', '{"minScore": 0, "maxScore": 100}', 'Calculation parameters'),
  ('session_timeout', '{"hours": 8}', 'Session timeout in hours'),
  ('email_templates', '{"poolApproval": "Pool for period {{period}} has been approved.", "calculationComplete": "Calculation for period {{period}} is complete.", "passwordReset": "Your password has been reset.", "newUser": "Welcome! Your temporary password is {{password}}."}', 'Email notification templates')
ON CONFLICT (key) DO NOTHING;
