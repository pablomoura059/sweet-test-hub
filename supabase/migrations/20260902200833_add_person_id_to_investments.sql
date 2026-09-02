-- Adiciona person_id à tabela investments
-- Permite vincular cada empréstimo a uma pessoa cadastrada

ALTER TABLE investments
ADD COLUMN IF NOT EXISTS person_id uuid REFERENCES people(id) ON DELETE SET NULL;

-- Comentário para documentação
COMMENT ON COLUMN investments.person_id IS 'ID da pessoa cadastrada na tabela people. Campo opcional para manter compatibilidade com registros existentes.';
