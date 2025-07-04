-- Marcar extrato CSV para reprocessamento e testar detecção de parcelas
UPDATE statements SET status = 'processing' WHERE filename LIKE '%Nubank_20250612%';