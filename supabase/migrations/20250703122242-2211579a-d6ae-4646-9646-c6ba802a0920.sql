-- Limpar dados de exemplo das transações de parcelas
DELETE FROM public.transactions 
WHERE description LIKE '%Agi*Tute Tech%' 
   OR description LIKE '%Apple Store - iPhone 15%' 
   OR description LIKE '%Casas Bahia - Sofá%';