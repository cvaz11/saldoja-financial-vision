-- Corrigir transação teste para aparecer na aba Parcelas
UPDATE transactions 
SET installment_number = 9, installment_total = 12
WHERE description = 'Agi*Tute Tech - Parcela 9/12';