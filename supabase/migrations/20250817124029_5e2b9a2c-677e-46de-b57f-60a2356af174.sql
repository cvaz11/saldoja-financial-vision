-- Corrigir classificação retroativa de transações
-- Primeiro, atualizar todas as transações para a classificação correta baseada no valor
UPDATE transactions 
SET is_credit = CASE
  WHEN amount < 0 THEN false  -- Valor negativo = despesa
  WHEN amount > 0 THEN true   -- Valor positivo = receita
  ELSE is_credit  -- Manter se amount = 0
END
WHERE amount != 0;