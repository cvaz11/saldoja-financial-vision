
-- Adicionar coluna closing_day na tabela statements para armazenar o dia de fechamento específico de cada extrato
ALTER TABLE public.statements 
ADD COLUMN closing_day integer DEFAULT 5 CHECK (closing_day >= 1 AND closing_day <= 31);

-- Adicionar comentário explicativo
COMMENT ON COLUMN public.statements.closing_day IS 'Dia do mês em que a fatura do banco fecha (1-31) para este extrato específico';

-- Atualizar extratos existentes com o valor padrão do perfil do usuário
UPDATE public.statements 
SET closing_day = COALESCE(
  (SELECT p.invoice_closing_day FROM public.profiles p WHERE p.user_id = statements.user_id),
  5
) 
WHERE closing_day IS NULL;

-- Tornar a coluna NOT NULL após a atualização
ALTER TABLE public.statements ALTER COLUMN closing_day SET NOT NULL;
