-- Deletar duplicatas da Agi*Tute Tech (manter apenas a primeira)
DELETE FROM transactions 
WHERE id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (
      PARTITION BY description, amount, transaction_date 
      ORDER BY created_at ASC
    ) as rn
    FROM transactions 
    WHERE description LIKE '%Agi*Tute Tech%'
  ) t WHERE rn > 1
);

-- Criar constraint unique para evitar duplicatas futuras
ALTER TABLE transactions 
ADD CONSTRAINT unique_installment_parcela 
UNIQUE (installment_id, installment_number);

-- Criar índice para performance em consultas de parcelas
CREATE INDEX IF NOT EXISTS idx_transactions_installment_lookup 
ON transactions(installment_id, installment_number, transaction_date);