
-- Script para limpar dados fake/exemplo das transações
-- Execute este script para remover todas as transações de exemplo

-- Deletar todas as transações existentes (dados fake)
DELETE FROM transactions;

-- Resetar statements para status processing se necessário
UPDATE statements SET status = 'processing' WHERE status = 'error';

-- Limpar totais dos statements
UPDATE statements SET total_credit = NULL, total_debit = NULL WHERE total_credit IS NOT NULL OR total_debit IS NOT NULL;
