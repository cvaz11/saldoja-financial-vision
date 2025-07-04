-- Corrigir data da transação Agi*Tute Tech
UPDATE transactions SET transaction_date = '2025-05-04' WHERE description LIKE '%Agi*Tute Tech%';

-- Adicionar coluna installment_id para evitar duplicatas
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS installment_id TEXT;

-- Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_transactions_installment_id ON transactions(installment_id);

-- Atualizar installment_id existente baseado na description + installment_total
UPDATE transactions 
SET installment_id = 'inst_' || md5(COALESCE(regexp_replace(description, '- Parcela \d+/\d+$', ''), description) || '_' || COALESCE(installment_total::text, '1'))
WHERE installment_number IS NOT NULL AND installment_total IS NOT NULL;