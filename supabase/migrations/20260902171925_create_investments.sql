-- Criar tabela de investimentos/empréstimos
CREATE TABLE IF NOT EXISTS investments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  person_name TEXT NOT NULL,
  invested_amount NUMERIC(12,2) NOT NULL CHECK (invested_amount > 0),
  profit_percent NUMERIC(5,2) NOT NULL CHECK (profit_percent >= 0),
  expected_profit NUMERIC(12,2) GENERATED ALWAYS AS (invested_amount * profit_percent / 100) STORED,
  expected_return NUMERIC(12,2) GENERATED ALWAYS AS (invested_amount + (invested_amount * profit_percent / 100)) STORED,
  actual_received NUMERIC(12,2),
  actual_profit NUMERIC(12,2),
  profit_difference NUMERIC(12,2),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'finished', 'late', 'canceled')),
  start_date DATE NOT NULL,
  return_date DATE NOT NULL,
  finalized_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_investments_user_id ON investments(user_id);
CREATE INDEX IF NOT EXISTS idx_investments_status ON investments(status);
CREATE INDEX IF NOT EXISTS idx_investments_start_date ON investments(start_date);
CREATE INDEX IF NOT EXISTS idx_investments_return_date ON investments(return_date);
CREATE INDEX IF NOT EXISTS idx_investments_person_name ON investments(person_name);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_investments_updated_at ON investments;
CREATE TRIGGER update_investments_updated_at
  BEFORE UPDATE ON investments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Habilitar RLS
ALTER TABLE investments ENABLE ROW LEVEL SECURITY;

-- Policy: usuários veem apenas seus próprios dados
DROP POLICY IF EXISTS "Users can view own investments" ON investments;
CREATE POLICY "Users can view own investments" ON investments
  FOR SELECT USING (auth.uid() = user_id);

-- Policy: usuários criam apenas seus próprios dados
DROP POLICY IF EXISTS "Users can insert own investments" ON investments;
CREATE POLICY "Users can insert own investments" ON investments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy: usuários editam apenas seus próprios dados
DROP POLICY IF EXISTS "Users can update own investments" ON investments;
CREATE POLICY "Users can update own investments" ON investments
  FOR UPDATE USING (auth.uid() = user_id);

-- Policy: usuários excluem apenas seus próprios dados
DROP POLICY IF EXISTS "Users can delete own investments" ON investments;
CREATE POLICY "Users can delete own investments" ON investments
  FOR DELETE USING (auth.uid() = user_id);
