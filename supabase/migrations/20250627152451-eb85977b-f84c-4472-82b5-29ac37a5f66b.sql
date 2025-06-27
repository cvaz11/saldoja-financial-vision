
-- Limpar todos os dados de teste do sistema
-- Excluir todas as transações
DELETE FROM transactions;

-- Excluir todos os extratos
DELETE FROM statements;

-- Resetar contadores de uploads nos perfis
UPDATE profiles SET pdf_uploads_this_month = 0 WHERE pdf_uploads_this_month > 0;

-- Limpar dados de teste específicos se houver
-- (mantendo apenas os perfis dos usuários para não quebrar as contas)
