-- Limpar dados inconsistentes e reprocessar automaticamente
DELETE FROM transactions WHERE description LIKE '%Agi*Tute Tech%';

-- Reprocessar o extrato automaticamente
UPDATE statements SET status = 'processing' WHERE filename LIKE '%Nubank%';