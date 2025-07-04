-- Remover transação teste inserida diretamente no banco
DELETE FROM transactions 
WHERE description = 'Agi*Tute Tech - Parcela 9/12' 
AND installment_number = 9 
AND installment_total = 12;