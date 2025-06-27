
-- Adicionar coluna para dia de fechamento da fatura na tabela profiles
ALTER TABLE public.profiles 
ADD COLUMN invoice_closing_day integer DEFAULT 5 CHECK (invoice_closing_day >= 1 AND invoice_closing_day <= 31);

-- Adicionar comentário explicativo
COMMENT ON COLUMN public.profiles.invoice_closing_day IS 'Dia do mês em que a fatura do cartão fecha (1-31)';
