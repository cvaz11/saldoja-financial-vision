-- Corrigir transações com installment_number e installment_total NULL
UPDATE transactions 
SET installment_number = 9, installment_total = 12 
WHERE description = 'Agi*Tute Tech - Parcela 9/12' 
AND (installment_number IS NULL OR installment_total IS NULL);