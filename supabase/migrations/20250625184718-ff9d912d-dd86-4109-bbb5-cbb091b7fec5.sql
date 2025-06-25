
-- Limpar todas as transações e resetar statements
DELETE FROM transactions;
UPDATE statements SET status = 'processing', total_credit = NULL, total_debit = NULL, parsed_at = NULL;
